/**
 * End-to-end API test.
 *
 * Runs against a live server + database:
 *   node tests/e2e.test.mjs [baseUrl]
 *
 * Covers every route group, the auth flows, ownership checks, validation,
 * and the concurrency guarantee that stops overselling.
 */
const BASE = process.argv[2] ?? 'http://localhost:4000';

let passed = 0;
let failed = 0;
const failures = [];

function check(name, condition, detail = '') {
  if (condition) {
    passed += 1;
    console.log(`  PASS  ${name}${detail ? `  (${detail})` : ''}`);
  } else {
    failed += 1;
    failures.push(name);
    console.log(`  FAIL  ${name}${detail ? `  (${detail})` : ''}`);
  }
}

function section(title) {
  console.log(`\n=== ${title} ===`);
}

const cookieJar = new Map();

async function api(path, options = {}) {
  const headers = { ...options.headers };
  if (!options.formData) headers['Content-Type'] = 'application/json';
  if (options.token) headers.Authorization = `Bearer ${options.token}`;
  if (cookieJar.size && options.withCookies) {
    headers.Cookie = [...cookieJar.entries()]
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
  }

  const res = await fetch(`${BASE}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body:
      options.formData ??
      (options.body ? JSON.stringify(options.body) : undefined),
  });

  const setCookie = res.headers.get('set-cookie');
  if (setCookie) {
    const [pair] = setCookie.split(';');
    const [key, value] = pair.split('=');
    cookieJar.set(key.trim(), value);
  }

  let json;
  const text = await res.text();
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  return { status: res.status, body: json, headers: res.headers };
}

const rand = Math.random().toString(36).slice(2, 8);

/* ====================================================================== */

section('HEALTH & ROOT');
{
  const health = await api('/api/health');
  check('GET /api/health returns 200', health.status === 200);
  check('database is up', health.body?.data?.database === 'up');
  check(
    'X-Request-Id header present',
    Boolean(health.headers.get('x-request-id'))
  );

  const root = await api('/');
  check(
    'GET / returns api info',
    root.status === 200 && root.body.data.name === 'Kick API'
  );

  const missing = await api('/api/does-not-exist');
  check(
    'unknown route returns 404 envelope',
    missing.status === 404 && missing.body.error.code === 'NOT_FOUND'
  );
}

section('AUTH — REGISTER & LOGIN');
let customerToken = null;
let customerEmail = `test.${rand}@example.com`;
{
  const bad = await api('/api/auth/register', {
    method: 'POST',
    body: {
      firstName: 'A',
      lastName: 'B',
      email: 'not-an-email',
      password: 'short',
    },
  });
  check(
    'register rejects bad input with 422',
    bad.status === 422 && bad.body.error.code === 'VALIDATION_ERROR',
    `${bad.body?.error?.details?.length ?? 0} field errors`
  );

  const weak = await api('/api/auth/register', {
    method: 'POST',
    body: {
      firstName: 'A',
      lastName: 'B',
      email: `w.${rand}@x.com`,
      password: 'alllowercase',
    },
  });
  check('register rejects password with no digit', weak.status === 422);

  const created = await api('/api/auth/register', {
    method: 'POST',
    body: {
      firstName: 'Test',
      lastName: 'Buyer',
      email: customerEmail,
      password: 'Password123',
      phone: '+91 90000 00001',
      marketingOptIn: true,
    },
  });
  check(
    'register succeeds',
    created.status === 201,
    `status ${created.status}`
  );
  check(
    'register returns an access token',
    Boolean(created.body?.data?.accessToken)
  );
  check(
    'register defaults role to customer',
    created.body?.data?.user?.role === 'customer'
  );
  check(
    'register never returns a password hash',
    !JSON.stringify(created.body).toLowerCase().includes('passwordhash')
  );
  check(
    'register returns a public_id (ULID), not a numeric id',
    typeof created.body?.data?.user?.id === 'string' &&
      created.body.data.user.id.length === 26,
    created.body?.data?.user?.id
  );
  customerToken = created.body?.data?.accessToken;

  const dupe = await api('/api/auth/register', {
    method: 'POST',
    body: {
      firstName: 'T',
      lastName: 'B',
      email: customerEmail,
      password: 'Password123',
    },
  });
  check(
    'duplicate email rejected with 409',
    dupe.status === 409,
    dupe.body?.error?.code
  );

  const wrongPass = await api('/api/auth/login', {
    method: 'POST',
    body: { email: customerEmail, password: 'WrongPassword1' },
  });
  const unknownEmail = await api('/api/auth/login', {
    method: 'POST',
    body: { email: `ghost.${rand}@x.com`, password: 'WrongPassword1' },
  });
  check('wrong password returns 401', wrongPass.status === 401);
  check(
    'unknown email returns the SAME message (no enumeration)',
    wrongPass.body?.error?.message === unknownEmail.body?.error?.message,
    wrongPass.body?.error?.message
  );

  const login = await api('/api/auth/login', {
    method: 'POST',
    body: { email: customerEmail, password: 'Password123' },
  });
  check('login succeeds', login.status === 200);
  check(
    'login sets an httpOnly refresh cookie',
    (login.headers.get('set-cookie') ?? '').includes('HttpOnly')
  );
  customerToken = login.body?.data?.accessToken;
}

section('AUTH — PROTECTED ROUTES');
{
  const noToken = await api('/api/auth/me');
  check('GET /me without a token returns 401', noToken.status === 401);

  const badToken = await api('/api/auth/me', { token: 'not.a.real.token' });
  check('GET /me with a garbage token returns 401', badToken.status === 401);

  const me = await api('/api/auth/me', { token: customerToken });
  check(
    'GET /me returns the profile',
    me.status === 200 && me.body.data.email === customerEmail
  );
  check(
    'profile includes derived loyalty tier',
    typeof me.body?.data?.tier === 'string',
    me.body?.data?.tier
  );

  const patched = await api('/api/auth/me', {
    method: 'PATCH',
    token: customerToken,
    body: {
      firstName: 'Renamed',
      preferredSize: '9',
      address: {
        line1: '1 Test St',
        city: 'Mumbai',
        state: 'MH',
        postalCode: '400001',
        country: 'India',
      },
    },
  });
  check(
    'PATCH /me updates the profile',
    patched.status === 200 && patched.body.data.firstName === 'Renamed'
  );
  check(
    'PATCH /me saves the address',
    patched.body?.data?.address?.city === 'Mumbai'
  );

  // Mass-assignment: unknown keys must be stripped by zod, not persisted.
  const escalate = await api('/api/auth/me', {
    method: 'PATCH',
    token: customerToken,
    body: { role: 'admin', status: 'blocked' },
  });
  check(
    'PATCH /me cannot escalate role',
    escalate.body?.data?.role === 'customer'
  );

  const refreshed = await api('/api/auth/refresh', {
    method: 'POST',
    withCookies: true,
  });
  check(
    'POST /refresh issues a new access token',
    refreshed.status === 200 && Boolean(refreshed.body?.data?.accessToken)
  );
  if (refreshed.body?.data?.accessToken)
    customerToken = refreshed.body.data.accessToken;
}

section('ADMIN AUTH');
let adminToken;
{
  const login = await api('/api/auth/login', {
    method: 'POST',
    body: { email: 'admin@Kick.com', password: 'ChangeMe123!' },
  });
  check('admin can sign in', login.status === 200, `status ${login.status}`);
  check('admin has the admin role', login.body?.data?.user?.role === 'admin');
  adminToken = login.body?.data?.accessToken;

  const asCustomer = await api('/api/admin/products', { token: customerToken });
  check(
    'customer CANNOT reach /api/admin/* (403)',
    asCustomer.status === 403 && asCustomer.body.error.code === 'FORBIDDEN'
  );

  const anon = await api('/api/admin/products');
  check('anonymous CANNOT reach /api/admin/* (401)', anon.status === 401);
}

section('STOREFRONT — PRODUCTS & CATEGORIES');
let sampleSlug;
let sampleProductId = null;
let sampleVariantId = null;
{
  const list = await api('/api/products');
  check(
    'GET /api/products returns a list',
    list.status === 200 && Array.isArray(list.body.data)
  );
  check(
    'product list is paginated',
    typeof list.body?.meta?.totalPages === 'number',
    `${list.body?.meta?.total} products`
  );

  const first = list.body?.data?.[0];
  sampleSlug = first?.slug;
  sampleProductId = first?.id;
  check('product exposes a slug', Boolean(sampleSlug), sampleSlug);
  check(
    'storefront NEVER exposes costPerItem',
    first && first.costPerItem === undefined
  );
  check(
    'storefront NEVER exposes internalId',
    first && first.internalId === undefined
  );
  check(
    'product id is a ULID, not a number',
    typeof first?.id === 'string' && first.id.length === 26
  );

  const filtered = await api('/api/products?gender=men&limit=5');
  check(
    'filter by gender works',
    filtered.status === 200 &&
      filtered.body.data.every((p) => p.gender === 'men'),
    `${filtered.body?.data?.length} men's products`
  );

  const priced = await api('/api/products?minPrice=150&maxPrice=200');
  check(
    'filter by price range works',
    priced.status === 200 &&
      priced.body.data.every((p) => p.price >= 150 && p.price <= 200)
  );

  const sorted = await api('/api/products?sort=price_asc&limit=5');
  const prices = sorted.body?.data?.map((p) => p.price) ?? [];
  check(
    'sort=price_asc is ordered',
    prices.every((p, i) => i === 0 || p >= prices[i - 1]),
    prices.join(',')
  );

  const search = await api('/api/products?q=runner');
  check(
    'full-text search returns results',
    search.status === 200 && search.body.data.length > 0,
    `${search.body?.data?.length} hits`
  );

  const badSort = await api('/api/products?sort=DROP TABLE products');
  check(
    'invalid sort is rejected by validation (no SQL injection)',
    badSort.status === 422
  );

  const featured = await api('/api/products/featured');
  check(
    'GET /products/featured works',
    featured.status === 200 && featured.body.data.length > 0
  );

  const filters = await api('/api/products/filters');
  check(
    'GET /products/filters returns sizes',
    Array.isArray(filters.body?.data?.sizes)
  );

  const detail = await api(`/api/products/${sampleSlug}`);
  check('GET /products/:slug returns the product', detail.status === 200);
  check('detail includes variants', Array.isArray(detail.body?.data?.variants));
  const inStockVariant = detail.body?.data?.variants?.find((v) => v.inStock);
  sampleVariantId = inStockVariant?.id;
  check(
    'variant exposes availability, not raw stock',
    inStockVariant &&
      inStockVariant.available > 0 &&
      inStockVariant.stock === undefined
  );
  const sizes = (detail.body?.data?.sizes ?? []).map(Number);
  check(
    'sizes are sorted NUMERICALLY (not "10" before "9")',
    sizes.every((n, i) => i === 0 || n >= sizes[i - 1]),
    detail.body?.data?.sizes?.join(',')
  );

  const missing = await api('/api/products/no-such-product');
  check('unknown slug returns 404', missing.status === 404);

  const related = await api(`/api/products/${sampleSlug}/related`);
  check('GET /products/:slug/related works', related.status === 200);

  const categories = await api('/api/categories');
  check(
    'GET /api/categories works',
    categories.status === 200 && categories.body.data.length > 0,
    `${categories.body?.data?.length} categories`
  );
  check(
    'category carries a product count',
    typeof categories.body?.data?.[0]?.productCount === 'number'
  );

  const catSlug = categories.body?.data?.[0]?.slug;
  const catProducts = await api(`/api/categories/${catSlug}/products`);
  check('GET /categories/:slug/products works', catProducts.status === 200);
}

section('CUSTOMER CART & FAVOURITES');
{
  const anonymousCart = await api('/api/cart');
  check(
    'anonymous customer cannot read an account cart',
    anonymousCart.status === 401
  );

  const added = await api('/api/cart/items', {
    method: 'POST',
    token: customerToken,
    body: { variantId: sampleVariantId, quantity: 2 },
  });
  check(
    'cart item is persisted for the signed-in customer',
    added.status === 200 && added.body?.data?.items?.[0]?.quantity === 2
  );

  const synced = await api('/api/cart/sync', {
    method: 'POST',
    token: customerToken,
    body: { items: [{ variantId: sampleVariantId, quantity: 3 }] },
  });
  check(
    'guest cart sync merges without losing the larger quantity',
    synced.status === 200 && synced.body?.data?.items?.[0]?.quantity === 3
  );

  const saved = await api(`/api/favourites/${sampleProductId}`, {
    method: 'POST',
    token: customerToken,
  });
  check(
    'product can be saved as a database-backed favourite',
    saved.status === 200 &&
      saved.body?.data?.products?.some((p) => p.id === sampleProductId)
  );

  const restored = await api('/api/favourites', { token: customerToken });
  check(
    'favourites are restored on a separate request',
    restored.status === 200 &&
      restored.body?.data?.products?.some((p) => p.id === sampleProductId)
  );
}

section('CHECKOUT — QUOTE & VALIDATION');
{
  const quote = await api('/api/orders/quote', {
    method: 'POST',
    body: { items: [{ variantId: sampleVariantId, quantity: 2 }] },
  });
  check('POST /orders/quote prices the cart', quote.status === 200);
  check(
    'quote computes subtotal, tax, shipping, total',
    typeof quote.body?.data?.subtotal === 'number' &&
      typeof quote.body?.data?.tax === 'number' &&
      typeof quote.body?.data?.total === 'number',
    `total ${quote.body?.data?.total}`
  );

  const expectedTax = Number((quote.body.data.subtotal * 0.08).toFixed(2));
  check(
    'tax is 8% of subtotal',
    Math.abs(quote.body.data.tax - expectedTax) < 0.02,
    `${quote.body.data.tax} vs ${expectedTax}`
  );

  const expectedTotal = Number(
    (
      quote.body.data.subtotal +
      quote.body.data.tax +
      quote.body.data.shipping
    ).toFixed(2)
  );
  check(
    'total = subtotal + tax + shipping',
    Math.abs(quote.body.data.total - expectedTotal) < 0.02
  );

  const empty = await api('/api/orders/quote', {
    method: 'POST',
    body: { items: [] },
  });
  check('empty cart is rejected', empty.status === 422);

  const noEmail = await api('/api/orders', {
    method: 'POST',
    body: {
      items: [{ variantId: sampleVariantId, quantity: 1 }],
      shippingAddress: {
        name: 'X',
        line1: '1 St',
        city: 'C',
        state: 'S',
        postalCode: '1',
        country: 'IN',
      },
      paymentMethod: 'cod',
    },
  });
  check('guest checkout without an email is rejected', noEmail.status === 400);

  const badAddress = await api('/api/orders', {
    method: 'POST',
    token: customerToken,
    body: {
      items: [{ variantId: sampleVariantId, quantity: 1 }],
      shippingAddress: { name: 'X' },
      paymentMethod: 'cod',
    },
  });
  check('incomplete address is rejected with 422', badAddress.status === 422);
}

section('CHECKOUT — PLACING AN ORDER');
let orderId;
{
  const before = await api(`/api/products/${sampleSlug}`);
  const variantBefore = before.body.data.variants.find(
    (v) => v.id === sampleVariantId
  );

  const order = await api('/api/orders', {
    method: 'POST',
    token: customerToken,
    body: {
      items: [{ variantId: sampleVariantId, quantity: 2 }],
      shippingAddress: {
        name: 'Test Buyer',
        phone: '+91 90000 00001',
        line1: '12 Marine Drive',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400001',
        country: 'India',
      },
      paymentMethod: 'cod',
      customerNote: 'Leave with the neighbour',
    },
  });
  check(
    'POST /api/orders creates the order',
    order.status === 201,
    `status ${order.status}`
  );
  orderId = order.body?.data?.order?.id;
  check(
    'order id is a ULID',
    typeof orderId === 'string' && orderId.length === 26
  );
  check(
    'order number looks like #1001',
    /^#\d+$/.test(order.body?.data?.order?.orderNumber ?? ''),
    order.body?.data?.order?.orderNumber
  );
  check(
    'order starts pending / unpaid',
    order.body?.data?.order?.status === 'pending' &&
      order.body?.data?.order?.paymentStatus === 'pending'
  );

  const after = await api(`/api/products/${sampleSlug}`);
  const variantAfter = after.body.data.variants.find(
    (v) => v.id === sampleVariantId
  );
  check(
    'stock was RESERVED (available dropped by 2)',
    variantAfter.available === variantBefore.available - 2,
    `${variantBefore.available} -> ${variantAfter.available}`
  );

  const detail = await api(`/api/orders/${orderId}`, { token: customerToken });
  check('GET /orders/:id returns the order', detail.status === 200);
  check(
    'order contains its line items',
    detail.body?.data?.items?.length === 1
  );
  check(
    'line item is a SNAPSHOT (has name + unit price)',
    Boolean(detail.body?.data?.items?.[0]?.name) &&
      typeof detail.body?.data?.items?.[0]?.unitPrice === 'number'
  );
  check(
    'customer never sees adminNote',
    detail.body?.data?.adminNote === undefined
  );

  const mine = await api('/api/orders', { token: customerToken });
  check(
    'GET /api/orders lists my orders',
    mine.status === 200 && mine.body.data.length >= 1
  );

  const cartAfterOrder = await api('/api/cart', { token: customerToken });
  check(
    'successful COD checkout clears the durable account cart',
    cartAfterOrder.status === 200 &&
      cartAfterOrder.body?.data?.items?.length === 0
  );
}

section('OWNERSHIP (IDOR)');
{
  const otherEmail = `other.${rand}@example.com`;
  const other = await api('/api/auth/register', {
    method: 'POST',
    body: {
      firstName: 'Other',
      lastName: 'User',
      email: otherEmail,
      password: 'Password123',
    },
  });
  const otherToken = other.body?.data?.accessToken;

  const otherCart = await api('/api/cart', { token: otherToken });
  const otherFavourites = await api('/api/favourites', { token: otherToken });
  check(
    'cart data never leaks between customer accounts',
    otherCart.status === 200 && otherCart.body?.data?.items?.length === 0
  );
  check(
    'favourites never leak between customer accounts',
    otherFavourites.status === 200 &&
      otherFavourites.body?.data?.products?.length === 0
  );

  const stolen = await api(`/api/orders/${orderId}`, { token: otherToken });
  check(
    "another customer gets 404 for someone else's order (not 403)",
    stolen.status === 404,
    `status ${stolen.status}`
  );

  const asAdmin = await api(`/api/admin/orders/${orderId}`, {
    token: adminToken,
  });
  check('admin CAN read any order', asAdmin.status === 200);
}

section('INSUFFICIENT STOCK');
{
  const huge = await api('/api/orders', {
    method: 'POST',
    token: customerToken,
    body: {
      items: [{ variantId: sampleVariantId, quantity: 10 }],
      shippingAddress: {
        name: 'T',
        line1: '1 St',
        city: 'Mumbai',
        state: 'MH',
        postalCode: '400001',
        country: 'India',
      },
      paymentMethod: 'cod',
    },
  });
  // Either the quantity cap or the stock check must stop it eventually;
  // with seeded stock of ~20 this should succeed, so we test the real
  // exhaustion case in the concurrency section below.
  check(
    'large quantity is handled without a 500',
    huge.status === 201 || huge.status === 409 || huge.status === 422,
    `status ${huge.status}`
  );
}

section('ADMIN — PRODUCTS');
let adminProductId;
{
  const list = await api('/api/admin/products', { token: adminToken });
  check('GET /api/admin/products works', list.status === 200);
  check(
    'admin list DOES include costPerItem',
    typeof list.body?.data?.[0]?.costPerItem === 'number'
  );

  const stats = await api('/api/admin/products/stats', { token: adminToken });
  check(
    'GET /admin/products/stats works',
    stats.status === 200 && typeof stats.body.data.total === 'number',
    `${stats.body?.data?.total} products, inventory ${stats.body?.data?.inventoryValue}`
  );

  const categories = await api('/api/admin/categories', { token: adminToken });
  const categoryId = categories.body?.data?.[0]?.id;

  const imageForm = new FormData();
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    'base64'
  );
  imageForm.append(
    'images',
    new Blob([png], { type: 'image/png' }),
    'black.png'
  );
  imageForm.append(
    'images',
    new Blob([png], { type: 'image/png' }),
    'white.png'
  );
  const uploaded = await api('/api/admin/products/image-uploads', {
    method: 'POST',
    token: adminToken,
    formData: imageForm,
  });
  const uploadedImages = uploaded.body?.data?.images ?? [];
  check(
    'colour image upload persists both files',
    uploaded.status === 201 &&
      uploadedImages.length === 2 &&
      uploadedImages.every((image) => image.startsWith('/uploads/'))
  );

  const created = await api('/api/admin/products', {
    method: 'POST',
    token: adminToken,
    body: {
      name: `Test Shoe ${rand}`,
      sku: `TEST-${rand.toUpperCase()}`,
      description:
        'A product created by the automated end-to-end test suite for verification.',
      categoryId,
      gender: 'unisex',
      brand: 'Kick',
      material: 'Mesh',
      price: 99.99,
      compareAtPrice: 129.99,
      costPerItem: 40,
      status: 'active',
      featured: false,
      colors: ['Black', 'White'],
      variants: [
        { size: '8', stock: 5 },
        { size: '9', stock: 3 },
      ],
      colorImages: [
        { color: 'Black', images: [uploadedImages[0]] },
        { color: 'White', images: [uploadedImages[1]] },
      ],
      tags: ['test'],
    },
  });
  check(
    'POST /admin/products creates a product',
    created.status === 201,
    `status ${created.status}`
  );
  adminProductId = created.body?.data?.id;
  check(
    'total_stock is computed from variants (2 colours x 8 = 16)',
    created.body?.data?.totalStock === 16,
    `got ${created.body?.data?.totalStock}`
  );
  check(
    'create response keeps a separate gallery for each colour',
    created.body?.data?.colorImages?.length === 2 &&
      created.body.data.colorImages[0].images[0] !==
        created.body.data.colorImages[1].images[0]
  );

  const publicColourProduct = await api(
    `/api/products/${created.body?.data?.slug}`
  );
  check(
    'storefront detail returns the exact admin colour-image mapping',
    publicColourProduct.status === 200 &&
      publicColourProduct.body?.data?.colorImages?.[0]?.images?.[0] ===
        uploadedImages[0] &&
      publicColourProduct.body?.data?.colorImages?.[1]?.images?.[0] ===
        uploadedImages[1]
  );

  const dupeSku = await api('/api/admin/products', {
    method: 'POST',
    token: adminToken,
    body: {
      name: 'Dupe',
      sku: `TEST-${rand.toUpperCase()}`,
      description: 'This SKU is a duplicate and must be rejected by the API.',
      categoryId,
      gender: 'unisex',
      brand: 'X',
      price: 10,
      colors: ['Black'],
      variants: [{ size: '8', stock: 1 }],
    },
  });
  check('duplicate SKU rejected with 409', dupeSku.status === 409);

  const badCompare = await api('/api/admin/products', {
    method: 'POST',
    token: adminToken,
    body: {
      name: 'Bad',
      sku: `BAD-${rand.toUpperCase()}`,
      description:
        'Compare-at price is lower than the selling price, which is invalid.',
      categoryId,
      gender: 'unisex',
      brand: 'X',
      price: 100,
      compareAtPrice: 50,
      colors: ['Black'],
      variants: [{ size: '8', stock: 1 }],
    },
  });
  check('compareAtPrice <= price rejected with 422', badCompare.status === 422);

  const updated = await api(`/api/admin/products/${adminProductId}`, {
    method: 'PATCH',
    token: adminToken,
    body: { price: 89.99, featured: true },
  });
  check(
    'PATCH /admin/products/:id updates',
    updated.status === 200 && updated.body.data.price === 89.99
  );

  const variants = await api(`/api/admin/products/${adminProductId}/variants`, {
    method: 'PATCH',
    token: adminToken,
    body: { variants: [{ size: '8', color: 'Black', stock: 50 }] },
  });
  check('PATCH variants updates stock', variants.status === 200);

  const detail = await api(`/api/admin/products/${adminProductId}`, {
    token: adminToken,
  });
  check(
    'admin detail includes sales stats',
    typeof detail.body?.data?.sales?.unitsSold === 'number'
  );

  const csv = await api('/api/admin/products/export', { token: adminToken });
  check(
    'CSV export works',
    csv.status === 200 && String(csv.body?.raw ?? '').startsWith('ID,Name,SKU')
  );
}

section('ADMIN — CATEGORIES');
let adminCategoryId;
{
  const created = await api('/api/admin/categories', {
    method: 'POST',
    token: adminToken,
    body: {
      name: `Test Cat ${rand}`,
      description: 'Created by the test suite.',
      color: 'violet',
    },
  });
  check('POST /admin/categories creates', created.status === 201);
  adminCategoryId = created.body?.data?.id;
  check(
    'slug is generated from the name',
    created.body?.data?.slug?.startsWith('test-cat'),
    created.body?.data?.slug
  );

  const assigned = await api(
    `/api/admin/categories/${adminCategoryId}/products`,
    {
      method: 'POST',
      token: adminToken,
      body: { productIds: [adminProductId] },
    }
  );
  check(
    'bulk-assign products to a category',
    assigned.status === 200 && assigned.body.data.assigned === 1
  );

  const products = await api(
    `/api/admin/categories/${adminCategoryId}/products`,
    { token: adminToken }
  );
  check(
    'category product list reflects the assignment',
    products.body?.data?.length === 1
  );

  const updated = await api(`/api/admin/categories/${adminCategoryId}`, {
    method: 'PATCH',
    token: adminToken,
    body: { color: 'rose' },
  });
  check(
    'PATCH /admin/categories/:id works',
    updated.body?.data?.color === 'rose'
  );

  const badColor = await api('/api/admin/categories', {
    method: 'POST',
    token: adminToken,
    body: { name: 'Bad Colour', color: 'neon' },
  });
  check('invalid category colour rejected with 422', badColor.status === 422);
}

section('ADMIN — ORDERS');
{
  const list = await api('/api/admin/orders', { token: adminToken });
  check(
    'GET /api/admin/orders works',
    list.status === 200 && list.body.data.length > 0
  );

  const filtered = await api('/api/admin/orders?status=pending', {
    token: adminToken,
  });
  check(
    'filter orders by status',
    filtered.status === 200 &&
      filtered.body.data.every((o) => o.status === 'pending')
  );

  const searched = await api('/api/admin/orders?q=Test', { token: adminToken });
  check('search orders by customer name', searched.status === 200);

  const illegal = await api(`/api/admin/orders/${orderId}/status`, {
    method: 'PATCH',
    token: adminToken,
    body: { status: 'delivered' },
  });
  check(
    'illegal status jump (pending -> delivered) rejected',
    illegal.status === 400,
    illegal.body?.error?.message?.slice(0, 60)
  );

  const processing = await api(`/api/admin/orders/${orderId}/status`, {
    method: 'PATCH',
    token: adminToken,
    body: { status: 'processing' },
  });
  check('pending -> processing allowed', processing.status === 200);

  const noTracking = await api(`/api/admin/orders/${orderId}/status`, {
    method: 'PATCH',
    token: adminToken,
    body: { status: 'shipped' },
  });
  check(
    'shipping without a tracking number is rejected',
    noTracking.status === 422
  );

  const shipped = await api(`/api/admin/orders/${orderId}/status`, {
    method: 'PATCH',
    token: adminToken,
    body: {
      status: 'shipped',
      courier: 'BlueDart',
      trackingNumber: 'BD1234567890',
    },
  });
  check('processing -> shipped with tracking works', shipped.status === 200);
  check('shipped_at timestamp was set', Boolean(shipped.body?.data?.shippedAt));

  const delivered = await api(`/api/admin/orders/${orderId}/status`, {
    method: 'PATCH',
    token: adminToken,
    body: { status: 'delivered' },
  });
  check('shipped -> delivered works', delivered.status === 200);

  const note = await api(`/api/admin/orders/${orderId}/note`, {
    method: 'PATCH',
    token: adminToken,
    body: { adminNote: 'Verified by test suite.' },
  });
  check('admin note can be set', note.status === 200);

  const csv = await api('/api/admin/orders/export', { token: adminToken });
  check(
    'order CSV export works',
    csv.status === 200 && String(csv.body?.raw ?? '').startsWith('Order,Date')
  );
}

section('ADMIN — CUSTOMERS');
{
  const list = await api('/api/admin/customers', { token: adminToken });
  check(
    'GET /api/admin/customers works',
    list.status === 200 && list.body.data.length > 0,
    `${list.body?.meta?.total} customers`
  );

  const first = list.body.data.find((c) => c.email === customerEmail);
  check(
    'customer row carries derived tier',
    typeof first?.tier === 'string',
    first?.tier
  );
  check(
    'customer row carries order stats',
    typeof first?.totalOrders === 'number',
    `${first?.totalOrders} orders, spent ${first?.totalSpent}`
  );
  check(
    'admin customer list exposes the ULID, never the numeric id',
    typeof first?.id === 'string' &&
      first.id.length === 26 &&
      first.internalId === undefined,
    first?.id
  );

  const searched = await api(
    `/api/admin/customers?q=${encodeURIComponent('Renamed')}`,
    { token: adminToken }
  );
  check(
    'customer search works',
    searched.status === 200 && searched.body.data.length >= 1
  );

  const detail = await api(`/api/admin/customers/${first.publicId}`, {
    token: adminToken,
  });
  check('GET /admin/customers/:id works', detail.status === 200);
  check(
    'detail includes favourite products',
    Array.isArray(detail.body?.data?.favouriteProducts)
  );

  const orders = await api(`/api/admin/customers/${first.publicId}/orders`, {
    token: adminToken,
  });
  check(
    'customer order history works',
    orders.status === 200 && orders.body.data.length >= 1
  );

  const blocked = await api(`/api/admin/customers/${first.publicId}/status`, {
    method: 'PATCH',
    token: adminToken,
    body: { status: 'blocked' },
  });
  check(
    'admin can block a customer',
    blocked.status === 200 && blocked.body.data.status === 'blocked'
  );

  const afterBlock = await api('/api/auth/me', { token: customerToken });
  check(
    'a blocked customer is rejected immediately (403)',
    afterBlock.status === 403
  );

  const unblocked = await api(`/api/admin/customers/${first.publicId}/status`, {
    method: 'PATCH',
    token: adminToken,
    body: { status: 'active' },
  });
  check('admin can unblock', unblocked.body?.data?.status === 'active');

  const csv = await api('/api/admin/customers/export', { token: adminToken });
  check(
    'customer CSV export works',
    csv.status === 200 &&
      String(csv.body?.raw ?? '').startsWith('ID,First Name')
  );
}

section('ADMIN — DASHBOARD');
{
  const overview = await api('/api/admin/dashboard/overview', {
    token: adminToken,
  });
  check('GET /admin/dashboard/overview works', overview.status === 200);
  check(
    'overview has stats + charts',
    Boolean(overview.body?.data?.stats) &&
      Array.isArray(overview.body?.data?.revenueChart)
  );

  const stats = await api('/api/admin/dashboard/stats', { token: adminToken });
  const s = stats.body?.data;
  check(
    'stats include revenue, orders, customers, AOV',
    typeof s?.totalRevenue === 'number' &&
      typeof s?.totalOrders === 'number' &&
      typeof s?.totalCustomers === 'number' &&
      typeof s?.avgOrderValue === 'number',
    `revenue ${s?.totalRevenue}, orders ${s?.totalOrders}`
  );
  check(
    'stats include fulfilment counters',
    typeof s?.pendingOrders === 'number' &&
      typeof s?.deliveredOrders === 'number'
  );
  check(
    'stats include period-over-period change',
    typeof s?.revenueChange === 'number'
  );

  for (const path of [
    'revenue',
    'daily',
    'revenue-by-category',
    'sales-by-size',
    'orders-by-status',
    'recent-orders',
    'top-products',
    'low-stock',
  ]) {
    const r = await api(`/api/admin/dashboard/${path}`, { token: adminToken });
    check(
      `GET /admin/dashboard/${path}`,
      r.status === 200 && Array.isArray(r.body.data)
    );
  }
}

section('CLEANUP + DELETE BEHAVIOUR');
{
  const removed = await api(`/api/admin/products/${adminProductId}`, {
    method: 'DELETE',
    token: adminToken,
  });
  check('DELETE /admin/products/:id soft-deletes', removed.status === 204);

  const gone = await api(`/api/admin/products/${adminProductId}`, {
    token: adminToken,
  });
  check('soft-deleted product is no longer returned', gone.status === 404);

  const catRemoved = await api(`/api/admin/categories/${adminCategoryId}`, {
    method: 'DELETE',
    token: adminToken,
  });
  check('DELETE /admin/categories/:id works', catRemoved.status === 200);

  const logout = await api('/api/auth/logout', {
    method: 'POST',
    withCookies: true,
  });
  check('POST /api/auth/logout works', logout.status === 200);
}

section('CONCURRENCY — THE OVERSELL TEST');
{
  // Create a product with exactly ONE pair in stock, then fire two
  // simultaneous checkouts at it. Exactly one must win.
  const categories = await api('/api/admin/categories', { token: adminToken });
  const categoryId = categories.body?.data?.[0]?.id;

  const scarce = await api('/api/admin/products', {
    method: 'POST',
    token: adminToken,
    body: {
      name: `Last Pair ${rand}`,
      sku: `LAST-${rand.toUpperCase()}`,
      description:
        'A product with exactly one pair in stock, for the concurrency test.',
      categoryId,
      gender: 'unisex',
      brand: 'Kick',
      price: 50,
      status: 'active',
      featured: false,
      colors: ['Black'],
      variants: [{ size: '9', stock: 1 }],
    },
  });
  check(
    'created a product with stock = 1',
    scarce.status === 201 && scarce.body?.data?.totalStock === 1,
    `stock ${scarce.body?.data?.totalStock}`
  );

  const detail = await api(`/api/products/${scarce.body.data.slug}`);
  const variantId = detail.body?.data?.variants?.[0]?.id;

  const buy = () =>
    api('/api/orders', {
      method: 'POST',
      token: customerToken,
      body: {
        items: [{ variantId, quantity: 1 }],
        shippingAddress: {
          name: 'Racer',
          line1: '1 St',
          city: 'Mumbai',
          state: 'MH',
          postalCode: '400001',
          country: 'India',
        },
        paymentMethod: 'cod',
      },
    });

  // Fire both at the same instant.
  const [a, b] = await Promise.all([buy(), buy()]);
  const statuses = [a.status, b.status].sort();

  check(
    'exactly ONE checkout succeeded, one got 409 INSUFFICIENT_STOCK',
    statuses[0] === 201 && statuses[1] === 409,
    `statuses ${statuses.join(' & ')}`
  );

  const after = await api(`/api/products/${scarce.body.data.slug}`);
  check(
    'no overselling — available is now 0',
    after.body?.data?.variants?.[0]?.available === 0,
    `available ${after.body?.data?.variants?.[0]?.available}`
  );

  const third = await buy();
  check('a third attempt is refused', third.status === 409);
}

/* ====================================================================== */

console.log(`\n${'='.repeat(60)}`);
console.log(`  ${passed} passed, ${failed} failed`);
if (failures.length) {
  console.log('\n  Failures:');
  failures.forEach((f) => console.log(`    - ${f}`));
}
console.log('='.repeat(60));
process.exit(failed === 0 ? 0 : 1);
