/**
 * Load & concurrency check.
 *
 *   node tests/load.test.mjs [baseUrl]
 *
 * Verifies the API stays correct and responsive under parallel traffic —
 * in particular that concurrent checkouts can never oversell.
 */
const BASE = process.argv[2] ?? 'http://localhost:4000';

async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (options.token) headers.Authorization = `Bearer ${options.token}`;
  const res = await fetch(`${BASE}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text };
  }
  return { status: res.status, body };
}

function percentile(sorted, p) {
  return sorted[
    Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))
  ];
}

async function timed(fn) {
  const t0 = performance.now();
  const result = await fn();
  return { ms: performance.now() - t0, result };
}

let failures = 0;
function check(name, ok, detail = '') {
  console.log(
    `  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`
  );
  if (!ok) failures += 1;
}

const rand = Math.random().toString(36).slice(2, 8);

console.log('\n=== SETUP ===');
const admin = await api('/api/auth/login', {
  method: 'POST',
  body: { email: 'admin@Kick.com', password: 'ChangeMe123!' },
});
const adminToken = admin.body?.data?.accessToken;
check('admin signed in', Boolean(adminToken));

const customer = await api('/api/auth/register', {
  method: 'POST',
  body: {
    firstName: 'Load',
    lastName: 'Tester',
    email: `load.${rand}@example.com`,
    password: 'Password123',
  },
});
const customerToken = customer.body?.data?.accessToken;
check('load-test customer created', Boolean(customerToken));

/* -------------------------------------------------------------------- */
console.log('\n=== READ THROUGHPUT (200 concurrent product reads) ===');
{
  const N = 200;
  const t0 = performance.now();
  const results = await Promise.all(
    Array.from({ length: N }, () => timed(() => api('/api/products?limit=20')))
  );
  const wall = performance.now() - t0;

  const oks = results.filter((r) => r.result.status === 200).length;
  const times = results.map((r) => r.ms).sort((a, b) => a - b);

  check('all 200 reads returned 200', oks === N, `${oks}/${N}`);
  console.log(
    `        wall ${wall.toFixed(0)}ms · ${(N / (wall / 1000)).toFixed(0)} req/s · ` +
      `p50 ${percentile(times, 50).toFixed(0)}ms · p95 ${percentile(times, 95).toFixed(0)}ms · ` +
      `p99 ${percentile(times, 99).toFixed(0)}ms`
  );
  // With 200 requests fired simultaneously at a small box, p95 mostly
  // measures queue depth. Throughput is the meaningful number here;
  // per-request latency is measured separately below.
  check(
    'sustained throughput above 150 req/s',
    N / (wall / 1000) > 150,
    `${(N / (wall / 1000)).toFixed(0)} req/s`
  );
}

/* -------------------------------------------------------------------- */
console.log('\n=== PER-REQUEST LATENCY (sequential, no queueing) ===');
{
  const N = 50;
  const times = [];
  for (let i = 0; i < N; i += 1) {
    const { ms } = await timed(() => api('/api/products?limit=20'));
    times.push(ms);
  }
  times.sort((a, b) => a - b);
  console.log(
    `        p50 ${percentile(times, 50).toFixed(1)}ms · ` +
      `p95 ${percentile(times, 95).toFixed(1)}ms · ` +
      `max ${times[times.length - 1].toFixed(1)}ms`
  );
  check(
    'p50 latency under 50ms',
    percentile(times, 50) < 50,
    `${percentile(times, 50).toFixed(1)}ms`
  );
  check(
    'p95 latency under 150ms',
    percentile(times, 95) < 150,
    `${percentile(times, 95).toFixed(1)}ms`
  );
}

/* -------------------------------------------------------------------- */
console.log('\n=== MIXED LOAD (150 concurrent, 5 endpoints) ===');
{
  const endpoints = [
    () => api('/api/products'),
    () => api('/api/categories'),
    () => api('/api/products/featured'),
    () => api('/api/health'),
    () => api('/api/auth/me', { token: customerToken }),
  ];
  const N = 150;
  const t0 = performance.now();
  const results = await Promise.all(
    Array.from({ length: N }, (_, i) => timed(endpoints[i % endpoints.length]))
  );
  const wall = performance.now() - t0;
  const oks = results.filter((r) => r.result.status === 200).length;
  const times = results.map((r) => r.ms).sort((a, b) => a - b);

  check('no errors under mixed load', oks === N, `${oks}/${N}`);
  console.log(
    `        wall ${wall.toFixed(0)}ms · ${(N / (wall / 1000)).toFixed(0)} req/s · ` +
      `p95 ${percentile(times, 95).toFixed(0)}ms`
  );
}

/* -------------------------------------------------------------------- */
console.log('\n=== OVERSELL UNDER LOAD (20 buyers, 5 pairs) ===');
{
  const categories = await api('/api/admin/categories', { token: adminToken });
  const categoryId = categories.body?.data?.[0]?.id;

  const product = await api('/api/admin/products', {
    method: 'POST',
    token: adminToken,
    body: {
      name: `Race Stock ${rand}`,
      sku: `RACE-${rand.toUpperCase()}`,
      description:
        'Five pairs in stock, twenty simultaneous buyers. Exactly five must win.',
      categoryId,
      gender: 'unisex',
      brand: 'Kick',
      price: 75,
      status: 'active',
      featured: false,
      colors: ['Black'],
      variants: [{ size: '9', stock: 5 }],
    },
  });
  check(
    'created product with stock = 5',
    product.body?.data?.totalStock === 5,
    `stock ${product.body?.data?.totalStock}`
  );

  const detail = await api(`/api/products/${product.body.data.slug}`);
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

  const t0 = performance.now();
  const results = await Promise.all(Array.from({ length: 20 }, buy));
  const wall = performance.now() - t0;

  const created = results.filter((r) => r.status === 201).length;
  const rejected = results.filter((r) => r.status === 409).length;
  const errors = results.filter((r) => r.status >= 500).length;

  console.log(
    `        ${created} created · ${rejected} rejected · ${errors} server errors · ${wall.toFixed(0)}ms`
  );

  check('exactly 5 orders succeeded', created === 5, `${created} created`);
  check(
    'the other 15 were cleanly rejected with 409',
    rejected === 15,
    `${rejected} rejected`
  );
  check('no 500s under contention', errors === 0);

  const after = await api(`/api/products/${product.body.data.slug}`);
  check(
    'stock is exactly 0 — nothing oversold',
    after.body?.data?.variants?.[0]?.available === 0,
    `available ${after.body?.data?.variants?.[0]?.available}`
  );
}

/* -------------------------------------------------------------------- */
console.log('\n=== CONNECTION POOL (300 concurrent DB-backed requests) ===');
{
  const N = 300;
  const t0 = performance.now();
  const results = await Promise.all(
    Array.from({ length: N }, () =>
      api('/api/admin/dashboard/stats', { token: adminToken })
    )
  );
  const wall = performance.now() - t0;
  const oks = results.filter((r) => r.status === 200).length;

  check(
    'pool handled 300 concurrent queries without exhaustion',
    oks === N,
    `${oks}/${N}`
  );
  console.log(
    `        wall ${wall.toFixed(0)}ms · ${(N / (wall / 1000)).toFixed(0)} req/s`
  );
}

console.log(`\n${'='.repeat(60)}`);
console.log(
  failures === 0 ? '  LOAD TEST PASSED' : `  ${failures} CHECK(S) FAILED`
);
console.log('='.repeat(60));
process.exit(failures === 0 ? 0 : 1);
