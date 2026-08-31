import * as cartService from '../services/cart.service.js';
import * as favouriteService from '../services/favourite.service.js';
import * as voiceSearch from '../services/voice-search.service.js';
import { getPublicBySlug } from '../services/product.service.js';
import { listForUser, getOrder } from '../services/order.service.js';
import { getPageState } from '../services/session-state.service.js';
import { emitToUser } from '../config/socket.js';
import { logger } from '../config/logger.js';
import { findByPublicId } from '../models/user.model.js';

// ─── ID Resolution ───────────────────────────────────────────────────────────
// FIX #1: Resolve ULID once per dispatch call, not once per handler.
// All socket emits use socketId (ULID) — page state and socket rooms are keyed by it.
// All DB writes use dbId (BIGINT internalId) — cart_items.user_id is BIGINT FK.

const ULID_RE = /^[0-9A-HJKMNP-TV-Z]{26}$/i;

async function resolveDbUserId(publicId) {
  if (!publicId || publicId === 'guest') return null;
  if (!ULID_RE.test(String(publicId))) return publicId; // already a numeric id
  try {
    const user = await findByPublicId(publicId);
    return user?.internalId ?? null;
  } catch (err) {
    logger.warn(
      { err: err.message, publicId },
      '[RetellFunctions] resolveDbUserId failed'
    );
    return null;
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function emit(socketId, type, payload = {}) {
  try {
    console.log(`\n🖥️ [BACKEND -> FRONTEND] Task: "${type}"`);
    if (payload.path) console.log(`   Navigate Path: ${payload.path}`);
    if (payload.message)
      console.log(`   Toast Notification: "${payload.message}"`);
    emitToUser(socketId, 'ui:command', {
      type,
      payload,
      timestamp: Date.now(),
    });
  } catch {
    /* silent */
  }
}

function ok(message, data = {}) {
  return { success: true, message, ...data };
}
function fail(message, extra = {}) {
  return { success: false, message, ...extra };
}

// ─── Per-session candidate store ─────────────────────────────────────────────
// Maps socketId → [{ name, slug, price, brand }]
// Populated by handleSearchProductsByName, consumed by handleConfirmProduct.
// Entries are cleared once the user confirms or starts a new search.
const pendingCandidates = new Map();

// ─── Variant Helpers ──────────────────────────────────────────────────────────

function normalizeColor(product, rawColor) {
  if (!product?.variants?.length || rawColor == null || rawColor === '')
    return null;
  const target = String(rawColor).trim().toLowerCase();
  const colors = [
    ...new Set(product.variants.map((v) => v.color).filter(Boolean)),
  ];

  const exact = colors.find((c) => c.toLowerCase() === target);
  if (exact) return exact;

  const synonyms = {
    gray: 'grey',
    grey: 'gray',
    'off-white': 'white',
    cream: 'beige',
  };
  if (synonyms[target]) {
    const match = colors.find((c) => c.toLowerCase() === synonyms[target]);
    if (match) return match;
  }

  return (
    colors.find(
      (c) =>
        c.toLowerCase().includes(target) || target.includes(c.toLowerCase())
    ) || null
  );
}

function normalizeSize(product, rawSize) {
  if (!product?.variants?.length || rawSize == null || rawSize === '')
    return null;
  const target = String(rawSize).trim();
  const sizes = [
    ...new Set(product.variants.map((v) => String(v.size)).filter(Boolean)),
  ];

  const exact = sizes.find((s) => s === target);
  if (exact) return exact;

  const num = parseFloat(target);
  if (!Number.isNaN(num)) {
    return sizes.find((s) => parseFloat(s) === num) || null;
  }
  return null;
}

// FIX #2: isVariantInStock checks both inStock and available fields.
// toPublicVariant sets `available` but NOT `inStock`, so the old check
// (v.inStock) always returned false for variants from getPublicBySlug.
function isVariantInStock(variant) {
  if (!variant) return false;
  if (variant.inStock !== undefined) return Boolean(variant.inStock);
  return Number(variant.available ?? 0) > 0;
}

// FIX #3: findVariantLocal — replaces voiceSearch.findVariant for handlers
// that already have the product object. voiceSearch.findVariant only checks
// v.inStock which is undefined on public API shapes. This checks both fields.
function findVariantLocal(product, size, color) {
  if (!product?.variants?.length) return null;
  return (
    product.variants.find(
      (v) =>
        (!size || String(v.size) === String(size)) &&
        (!color || v.color?.toLowerCase() === color.toLowerCase()) &&
        isVariantInStock(v)
    ) || null
  );
}

function selectionRedirectArgs(args, socketId) {
  const tracked = getPageState(socketId);
  if (tracked?.type !== 'product' || !tracked.slug) return null;
  if (args.product_name || args.product_id) return null;

  const text = String(args.query || args.q || '').toLowerCase();
  const extractedColor = args.color || voiceSearch.extractColor(text);
  const extractedSize = args.size || voiceSearch.extractSize(text);
  if (!extractedColor && !extractedSize) return null;

  const hasOtherFilter =
    Boolean(args.category || args.brand || args.material || args.gender) ||
    Boolean(
      voiceSearch.extractCategory(text) ||
      voiceSearch.extractBrand(text) ||
      voiceSearch.extractMaterial(text) ||
      voiceSearch.extractGender(text)
    );
  const hasPrice = [
    args.min_price,
    args.max_price,
    args.price_min,
    args.price_max,
  ].some((v) => v !== undefined && v !== null);
  if (hasOtherFilter || hasPrice) return null;

  const selectionVerb =
    /\b(select|pick|choose|switch|change|make it|go with|i want|i'll take|put me in|swap|try|grab)\b/i.test(
      text
    );
  const browseWord =
    /\b(show|find|browse|search|looking|list|suggest|recommend|any|some|best|cheap|under|over|need)\b/i.test(
      text
    );

  return selectionVerb || !browseWord
    ? { color: extractedColor, size: extractedSize }
    : null;
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

async function handleSearchProduct(args = {}, socketId) {
  logger.info(
    { args, socketId },
    '[RetellHandler] handleSearchProduct invoked'
  );

  const selectionArgs = selectionRedirectArgs(args, socketId);
  if (selectionArgs) return handleSelectVariant(selectionArgs, socketId);

  const result = await voiceSearch.search(args);

  if (result.type === 'not_found') {
    emit(socketId, 'navigate', { path: result.navigateTo || '/products' });
    emit(socketId, 'toast', { message: result.message, kind: 'info' });
    return ok(result.message, {
      total: 0,
      navigateTo: result.navigateTo || '/products',
    });
  }

  if (result.type === 'error') return fail(result.message);

  if (result.type === 'exact') {
    emit(socketId, 'navigate', { path: `/product/${result.product.slug}` });
    emit(socketId, 'toast', {
      message: `Opening ${result.product.name}`,
      kind: 'info',
    });
    return ok(result.message, {
      product: {
        id: result.product.id,
        name: result.product.name,
        brand: result.product.brand,
        price: result.product.price,
        slug: result.product.slug,
        material: result.product.material,
        gender: result.product.gender,
        inStock: result.product.inStock,
        sizes: result.product.sizes || [],
        colors: result.product.colors || [],
      },
    });
  }

  emit(socketId, 'products:override', {
    products: (result.products || []).slice(0, 6),
  });
  emit(socketId, 'toast', {
    message: result.toastMessage || result.message,
    kind: 'info',
  });
  return ok(result.message, {
    total: result.total,
    navigateTo: result.navigateTo,
    products: (result.products || []).slice(0, 6).map((p) => ({
      name: p.name,
      brand: p.brand,
      price: p.price,
      slug: p.slug,
      material: p.material,
      gender: p.gender,
    })),
  });
}

async function handleSuggestProducts(args = {}, socketId, dbId) {
  const suggestionArgs =
    typeof args === 'string'
      ? { query: `suggest ${args}`, isSuggestion: true }
      : { ...args, isSuggestion: true };
  return handleSearchProduct(suggestionArgs, socketId, dbId);
}

async function handleAddToCart(
  { product_id, product_slug, product_name, size, color, quantity = 1 },
  socketId,
  dbId
) {
  if (!dbId) return fail('Please sign in to add items to your cart.');

  try {
    // 1. Resolve product — agent args first, then open product page
    let product = null;
    const tracked = getPageState(socketId);

    if (product_slug) {
      product = await getPublicBySlug(product_slug);
    } else if (product_name) {
      const r = await voiceSearch.search({ query: product_name });
      const foundSlug = r.product?.slug || (r.products && r.products[0]?.slug);
      if (foundSlug) product = await getPublicBySlug(foundSlug);
    } else if (product_id) {
      const r = await voiceSearch.search({ query: product_id });
      const foundSlug = r.product?.slug || (r.products && r.products[0]?.slug);
      if (foundSlug) product = await getPublicBySlug(foundSlug);
    } else if (tracked?.type === 'product' && tracked.slug) {
      product = await getPublicBySlug(tracked.slug);
    }

    // Ensure full product variants are loaded from database/cache
    if (
      product &&
      (!product.variants || !product.variants.length) &&
      product.slug
    ) {
      product = await getPublicBySlug(product.slug);
    }

    if (!product) {
      return fail(
        'I could not find that product. Please search for a shoe first, then say "add to cart".'
      );
    }

    if (!product.inStock && !product.variants?.some(isVariantInStock)) {
      return fail(`Sorry, ${product.name} is currently out of stock.`);
    }

    // 2. Inherit size/color from page state when agent omits them.
    if (tracked?.type === 'product' && tracked.slug === product.slug) {
      if (!size && tracked.size) size = String(tracked.size);
      if (!color && tracked.color) color = tracked.color;
    }

    // 3. Normalize size and color via fuzzy matching against actual variants
    if (size) size = normalizeSize(product, size) || size;
    if (color) color = normalizeColor(product, color) || color;

    // 4. Validate before findVariant so error messages are specific
    const availableSizes = [
      ...new Set(
        product.variants?.filter(isVariantInStock).map((v) => String(v.size))
      ),
    ].sort((a, b) => Number(a) - Number(b));
    const availableColors = [
      ...new Set(
        product.variants
          ?.filter(isVariantInStock)
          .map((v) => v.color)
          .filter(Boolean)
      ),
    ];

    if (!size && availableSizes.length > 1) {
      return fail(
        `What size do you want for ${product.name}? Available sizes: ${availableSizes.join(', ')}.`,
        { availableSizes, availableColors }
      );
    }

    // Colors available for the chosen size (better targeted error message)
    const colorsForSize = size
      ? [
          ...new Set(
            product.variants
              ?.filter(
                (v) => isVariantInStock(v) && String(v.size) === String(size)
              )
              .map((v) => v.color)
              .filter(Boolean)
          ),
        ]
      : availableColors;

    // FIX: use local findVariant that handles both inStock and available fields
    const variant = findVariantLocal(product, size, color);

    if (!variant) {
      let msg = `I couldn't find ${product.name}`;
      if (size) msg += ` in size ${size}`;
      if (color) msg += ` in ${color}`;
      msg += `.`;
      if (colorsForSize.length)
        msg += ` Available colors${size ? ` for size ${size}` : ''}: ${colorsForSize.join(', ')}.`;
      else if (availableSizes.length)
        msg += ` Available sizes: ${availableSizes.join(', ')}.`;
      return fail(msg, { availableSizes, availableColors: colorsForSize });
    }

    // 4. DB write — uses dbId (BIGINT), variant.id is ULID (correct for variantModel.findByPublicId)
    await cartService.addItem(dbId, {
      variantId: variant.id,
      quantity: Math.min(quantity, 10),
    });

    emit(socketId, 'cart:refresh', {});
    emit(socketId, 'toast', {
      message: `Added ${product.name}${size ? ` size ${size}` : ''}${color ? ` in ${color}` : ''} to your cart.`,
      kind: 'success',
    });
    return ok(
      `Added ${product.name}${size ? ` size ${size}` : ''}${color ? ` in ${color}` : ''} to your cart!`
    );
  } catch (err) {
    logger.error({ err: err.message, socketId, dbId }, 'handleAddToCart error');
    const raw = err.message || '';
    // Sanitize DB/SQL errors — never speak them to the user
    if (
      /truncated|column|row \d|sql|duplicate entry|constraint|foreign key/i.test(
        raw
      )
    ) {
      logger.error(
        { raw, socketId, dbId },
        '[handleAddToCart] raw DB error suppressed'
      );
      return fail(
        'Something went wrong adding to your cart. Please try again.'
      );
    }
    // Domain errors (sold out, stock) are safe to surface
    return fail(raw || 'Failed to add item to cart. Please try again.');
  }
}

async function handleRemoveFromCart(
  { product_name, variant_id, product_slug },
  socketId,
  dbId
) {
  if (!dbId) return fail('Please sign in first.');

  try {
    if (!variant_id && (product_name || product_slug)) {
      const items = await cartService.get(dbId);
      const needle = (product_name || product_slug || '').toLowerCase();
      const match = items.find(
        (i) =>
          i.name?.toLowerCase().includes(needle) ||
          i.slug?.toLowerCase() === needle
      );
      if (!match) {
        return fail(
          `I don't see ${product_name || product_slug} in your cart. Say "show my cart" to check what's in there.`
        );
      }
      variant_id = match.variantId || match.variant_id || match.id;
    }

    if (!variant_id) {
      return fail(
        'Please tell me which item to remove, or say "show my cart" first.'
      );
    }

    await cartService.removeItem(dbId, variant_id);
    emit(socketId, 'cart:refresh', {});
    emit(socketId, 'toast', {
      message: 'Item removed from cart.',
      kind: 'info',
    });
    return ok('Done, item removed from your cart.');
  } catch (err) {
    logger.error({ err: err.message }, 'handleRemoveFromCart error');
    return fail('Failed to remove item. Please try again.');
  }
}

async function handleClearCart(_, socketId, dbId) {
  if (!dbId) return fail('Please sign in first.');
  try {
    await cartService.clear(dbId);
    emit(socketId, 'cart:refresh', {});
    emit(socketId, 'toast', { message: 'Cart cleared.', kind: 'info' });
    return ok('Your cart has been cleared.');
  } catch {
    return fail('Failed to clear cart.');
  }
}

// FIX #4: handleGetCart — full cart details for the `get_cart` tool which was
// missing entirely. The Retell agent config defines get_cart but had no handler.
async function handleGetCart(_, socketId, dbId) {
  if (!dbId) return fail('Please sign in to view your cart.');
  try {
    const items = await cartService.get(dbId);
    if (!items.length) return ok('Your cart is empty.', { items: [] });
    const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    return ok(
      `You have ${items.length} item${items.length > 1 ? 's' : ''} in your cart. Total: $${total.toFixed(2)}.`,
      {
        items: items.map((i) => ({
          name: i.name,
          brand: i.brand,
          size: i.size,
          color: i.color,
          quantity: i.quantity,
          price: i.price,
          variantId: i.variantId || i.id,
          slug: i.slug,
        })),
        total: total.toFixed(2),
        count: items.length,
      }
    );
  } catch {
    return fail('Could not retrieve your cart.');
  }
}

async function handleGetCartSummary(_, socketId, dbId) {
  if (!dbId) return fail('Please sign in to view your cart.');
  try {
    const items = await cartService.get(dbId);
    if (!items.length) return ok('Your cart is empty.');
    const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const summary = items.map((i) => `${i.name} x${i.quantity}`).join(', ');
    return ok(
      `You have ${items.length} item${items.length > 1 ? 's' : ''} in your cart: ${summary}. Total: $${total.toFixed(2)}.`
    );
  } catch {
    return fail('Could not retrieve your cart.');
  }
}

// FIX #5: handleUpdateCartQuantity — was missing entirely despite being in the
// Retell agent tool config. Handles increase/decrease/set by product_name or variant_id.
async function handleUpdateCartQuantity(
  { variant_id, product_name, product_slug, quantity, delta, action },
  socketId,
  dbId
) {
  if (!dbId) return fail('Please sign in first.');

  try {
    const items = await cartService.get(dbId);
    if (!items.length) return fail('Your cart is empty.');

    let item = null;
    if (variant_id) {
      item = items.find((i) => (i.variantId || i.id) === variant_id);
    } else if (product_name || product_slug) {
      const needle = (product_name || product_slug || '').toLowerCase();
      item = items.find(
        (i) =>
          i.name?.toLowerCase().includes(needle) ||
          i.slug?.toLowerCase() === needle
      );
    }

    if (!item) {
      const cartSummary = items.map((i) => i.name).join(', ');
      return fail(
        `I couldn't find that item in your cart. You have: ${cartSummary}.`
      );
    }

    const currentQty = item.quantity || 1;
    let newQty;

    if (quantity !== undefined && quantity !== null) {
      newQty = Math.max(1, Math.min(10, Number(quantity)));
    } else if (delta !== undefined && delta !== null) {
      newQty = Math.max(1, Math.min(10, currentQty + Number(delta)));
    } else if (action === 'increase') {
      newQty = Math.min(10, currentQty + 1);
    } else if (action === 'decrease') {
      newQty = Math.max(1, currentQty - 1);
    } else {
      return fail('Please tell me the new quantity or say increase/decrease.');
    }

    const resolvedVariantId = item.variantId || item.id;
    await cartService.setItem(dbId, {
      variantId: resolvedVariantId,
      quantity: newQty,
    });
    emit(socketId, 'cart:refresh', {});
    emit(socketId, 'toast', {
      message: `Updated ${item.name} quantity to ${newQty}.`,
      kind: 'info',
    });
    return ok(`Updated ${item.name} quantity to ${newQty}.`, {
      newQuantity: newQty,
    });
  } catch (err) {
    logger.error({ err: err.message }, 'handleUpdateCartQuantity error');
    return fail('Failed to update quantity. Please try again.');
  }
}

// FIX #6: handleToggleFavourite — removed `required: ["product_slug"]` constraint
// at the tool schema level (see agent JSON fix), and handle no-slug case here.
async function handleToggleFavourite(
  { product_slug, product_name, action },
  socketId,
  dbId
) {
  if (!dbId) return fail('Please sign in to save favourites.');

  try {
    let product = null;
    if (product_slug) {
      product = await getPublicBySlug(product_slug);
    } else if (product_name) {
      const r = await voiceSearch.search({ query: product_name });
      if (r.type === 'exact') product = r.product;
    } else {
      const tracked = getPageState(socketId);
      if (tracked?.type === 'product' && tracked.slug) {
        product = await getPublicBySlug(tracked.slug);
      }
    }

    if (!product)
      return fail(
        'Could not find that product. Which shoe do you want to save?'
      );

    const favourites = await favouriteService.get(dbId);
    const isSaved = favourites.some(
      (f) => f.id === product.id || f.slug === product.slug
    );

    if (action === 'add' || (!action && !isSaved)) {
      await favouriteService.add(dbId, product.id);
      emit(socketId, 'wishlist:refresh', {});
      emit(socketId, 'toast', {
        message: `${product.name} saved to favourites.`,
        kind: 'success',
      });
      return ok(`${product.name} has been saved to your favourites.`);
    } else {
      await favouriteService.remove(dbId, product.id);
      emit(socketId, 'wishlist:refresh', {});
      emit(socketId, 'toast', {
        message: `${product.name} removed from favourites.`,
        kind: 'info',
      });
      return ok(`${product.name} has been removed from your favourites.`);
    }
  } catch (err) {
    logger.error({ err: err.message }, 'handleToggleFavourite error');
    return fail('Failed to update favourites.');
  }
}

async function handleSelectVariant(
  { product_slug, product_id, product_name, color, size },
  socketId
) {
  try {
    const tracked = getPageState(socketId);

    let product = null;
    let source = 'agent';
    if (product_slug) {
      product = await getPublicBySlug(product_slug);
    } else if (product_name) {
      const r = await voiceSearch.search({ query: product_name });
      const foundSlug = r.product?.slug || (r.products && r.products[0]?.slug);
      if (foundSlug) product = await getPublicBySlug(foundSlug);
    } else if (product_id) {
      const r = await voiceSearch.search({ query: product_id });
      const foundSlug = r.product?.slug || (r.products && r.products[0]?.slug);
      if (foundSlug) product = await getPublicBySlug(foundSlug);
    } else if (tracked?.type === 'product' && tracked.slug) {
      product = await getPublicBySlug(tracked.slug);
      source = 'tracked';
    }

    if (
      product &&
      (!product.variants || !product.variants.length) &&
      product.slug
    ) {
      product = await getPublicBySlug(product.slug);
    }

    const pageInfo = tracked
      ? {
          type: tracked.type,
          path: tracked.path,
          slug: tracked.slug,
          color: tracked.color,
          size: tracked.size,
        }
      : null;

    if (!product) {
      const where =
        tracked?.type && tracked.type !== 'unknown'
          ? `The customer is on the ${tracked.type === 'product' ? 'product' : tracked.path || tracked.type} page`
          : "I cannot see a product page on the customer's screen right now";
      return fail(
        `${where}. To select a color or size, open a product first, or use filter_products to narrow the catalog.`,
        { page: pageInfo }
      );
    }

    const availableColors = [
      ...new Set(
        product.variants
          ?.filter(isVariantInStock)
          .map((v) => v.color)
          .filter(Boolean)
      ),
    ];
    const availableSizes = [
      ...new Set(
        product.variants
          ?.filter(isVariantInStock)
          .map((v) => String(v.size))
          .filter(Boolean)
      ),
    ].sort((a, b) => Number(a) - Number(b));

    const wantsColor = color != null && String(color).trim() !== '';
    const wantsSize = size != null && String(size).trim() !== '';

    if (!wantsColor && !wantsSize) {
      return ok(
        `${product.name} is on your screen. Available colors: ${availableColors.join(', ') || 'none'}. Available sizes: ${availableSizes.join(', ') || 'none'}.`,
        {
          product: { slug: product.slug, name: product.name },
          colors: availableColors,
          sizes: availableSizes,
          source,
        }
      );
    }

    const trackedColor =
      tracked?.type === 'product' && tracked.slug === product.slug
        ? tracked.color
        : null;

    let canonicalColor = null;
    if (wantsColor) {
      canonicalColor = normalizeColor(product, color);
      if (!canonicalColor) {
        return fail(
          `${product.name} does not come in that color. Available colors: ${availableColors.join(', ') || 'none right now'}.`,
          { availableColors, availableSizes, page: pageInfo }
        );
      }
      if (
        !availableColors.some(
          (c) => c.toLowerCase() === canonicalColor.toLowerCase()
        )
      ) {
        return fail(
          `${canonicalColor} is currently out of stock for ${product.name}. Available colors: ${availableColors.join(', ') || 'none right now'}.`,
          { availableColors, availableSizes, page: pageInfo }
        );
      }
    }

    let canonicalSize = null;
    if (wantsSize) {
      canonicalSize = normalizeSize(product, size);
      if (!canonicalSize) {
        return fail(
          `${product.name} does not come in size ${String(size).trim()}. Available sizes: ${availableSizes.join(', ') || 'none right now'}.`,
          { availableColors, availableSizes, page: pageInfo }
        );
      }

      const effectiveColor = canonicalColor || trackedColor;
      if (effectiveColor) {
        const variant = product.variants.find(
          (v) =>
            String(v.color).toLowerCase() === effectiveColor.toLowerCase() &&
            String(v.size) === canonicalSize
        );
        if (!variant || !isVariantInStock(variant)) {
          const sizesForColor = [
            ...new Set(
              product.variants
                .filter(
                  (v) =>
                    String(v.color).toLowerCase() ===
                      effectiveColor.toLowerCase() && isVariantInStock(v)
                )
                .map((v) => String(v.size))
            ),
          ].sort((a, b) => Number(a) - Number(b));
          return fail(
            `Size ${canonicalSize} is not available in ${effectiveColor}. Available sizes in ${effectiveColor}: ${sizesForColor.join(', ') || 'none right now'}.`,
            { availableColors, availableSizes, page: pageInfo }
          );
        }
      } else {
        if (
          !product.variants.some(
            (v) => String(v.size) === canonicalSize && isVariantInStock(v)
          )
        ) {
          return fail(
            `Size ${canonicalSize} is currently out of stock. Available sizes: ${availableSizes.join(', ') || 'none right now'}.`,
            { availableColors, availableSizes, page: pageInfo }
          );
        }
      }
    }

    const payload = { slug: product.slug };
    if (canonicalColor) payload.color = canonicalColor;
    if (canonicalSize) payload.size = canonicalSize;
    emit(socketId, 'variant:select', payload);

    const chosenParts = [
      canonicalColor,
      canonicalSize && `size ${canonicalSize}`,
    ].filter(Boolean);
    return ok(
      `Selected ${product.name}${chosenParts.length ? ` in ${chosenParts.join(', ')}` : ''}.`,
      {
        product: { slug: product.slug, name: product.name },
        color: canonicalColor || null,
        size: canonicalSize || null,
        source,
      }
    );
  } catch (err) {
    logger.error({ err: err.message, socketId }, 'handleSelectVariant error');
    return fail('Could not select that color and size. Please try again.');
  }
}

async function handleGetCurrentPage(_, socketId) {
  const tracked = getPageState(socketId);
  if (!tracked || tracked.type === 'unknown') {
    return ok(
      'I do not have a live reading of which page the customer is viewing right now.',
      { page: null }
    );
  }

  let description;
  if (tracked.type === 'product') {
    let name = tracked.slug;
    try {
      const product = await getPublicBySlug(tracked.slug);
      if (product) name = product.name;
    } catch {
      /* keep slug */
    }
    const selection = [tracked.color, tracked.size && `size ${tracked.size}`]
      .filter(Boolean)
      .join(', ');
    description = `the product page for ${name}${selection ? ` with ${selection} selected` : ''}`;
  } else {
    const p = String(tracked.path || '')
      .toLowerCase()
      .split('?')[0];
    let pageName;
    if (p === '/' || p === '') pageName = 'the home page';
    else if (p === '/cart') pageName = 'the shopping cart page';
    else if (p === '/checkout/payment' || p.startsWith('/checkout'))
      pageName = 'the checkout page';
    else if (p === '/products' || tracked.type === 'catalog')
      pageName = 'the product catalog page';
    else if (p === '/profile' || p === '/favourites')
      pageName = 'the profile page';
    else if (p === '/orders') pageName = 'the order history page';
    else if (p === '/about') pageName = 'the about page';
    else if (p === '/contact') pageName = 'the contact page';
    else if (p === '/login') pageName = 'the login page';
    else if (p === '/signup') pageName = 'the signup page';
    else pageName = `the ${tracked.type || 'catalog'} page`;

    description = pageName;
  }

  return ok(`The customer is on ${description}.`, {
    page: {
      type: tracked.type,
      path: tracked.path,
      slug: tracked.slug,
      color: tracked.color || null,
      size: tracked.size || null,
      filters: tracked.filters || null,
      productDetails: tracked.productDetails || null,
      cartSummary: tracked.cartSummary || null,
      lastAction: tracked.lastAction || null,
    },
  });
}

async function handleNavigateTo({ page }, socketId) {
  const PAGES = {
    home: '/',
    products: '/products',
    cart: '/cart',
    profile: '/profile',
    orders: '/orders',
    favourites: '/profile',
    wishlist: '/profile',
    checkout: '/checkout/payment',
    about: '/about',
    contact: '/contact',
    blogs: '/blogs',
    login: '/login',
    signup: '/signup',
  };
  const path = PAGES[page?.toLowerCase()];
  if (!path)
    return fail(
      `I don't know how to navigate to "${page}". Try: home, products, cart, profile, or orders.`
    );
  emit(socketId, 'navigate', { path });
  return ok(`Navigating to ${page}.`);
}

async function handleFilterProducts(args = {}, socketId) {
  const selectionArgs = selectionRedirectArgs(args, socketId);
  if (selectionArgs) return handleSelectVariant(selectionArgs, socketId);

  let {
    color,
    size,
    gender,
    min_price,
    max_price,
    price_min,
    price_max,
    sort,
    category,
    brand,
    material,
    query,
    q,
  } = args;
  const rawText = [query, q, brand, category, material]
    .filter(Boolean)
    .join(' ');

  if (!brand) brand = voiceSearch.extractBrand(rawText);
  if (!category) {
    const ec = voiceSearch.extractCategory(rawText);
    if (ec) category = ec.slug;
  }
  if (!gender) gender = voiceSearch.extractGender(rawText);
  if (!color) color = voiceSearch.extractColor(rawText);
  if (!material) material = voiceSearch.extractMaterial(rawText);

  const actualMinPrice = min_price ?? price_min;
  const actualMaxPrice = max_price ?? price_max;

  const params = new URLSearchParams();
  if (category) params.set('category', category);
  if (gender) params.set('gender', gender);
  if (color) params.set('color', color);
  if (size) params.set('size', String(size));
  if (actualMinPrice != null) params.set('priceMin', String(actualMinPrice));
  if (actualMaxPrice != null) params.set('priceMax', String(actualMaxPrice));

  if (brand) {
    params.set('q', brand);
  } else if (query?.trim()) {
    const cleanQ = query
      .toLowerCase()
      .replace(
        /\b(running|sneakers|casual|formal|boots|basketball|outdoor|training|shoes|shoe|for|in|men|women|unisex|kids)\b/gi,
        ''
      )
      .replace(/\s+/g, ' ')
      .trim();
    if (cleanQ) params.set('q', cleanQ);
  }

  const SORT_MAP = {
    price_asc: 'price_asc',
    price_desc: 'price_desc',
    lowest: 'price_asc',
    highest: 'price_desc',
    newest: 'newest',
    popular: 'popular',
    rating: 'rating',
  };
  if (sort) params.set('sort', SORT_MAP[sort] || sort);

  const path = `/products?${params.toString()}`;
  emit(socketId, 'navigate', { path });
  emit(socketId, 'toast', {
    message: 'Filters applied. Showing matching products.',
    kind: 'info',
  });

  const descParts = [
    brand && `Brand: ${brand}`,
    category && `Category: ${category}`,
    gender && `Gender: ${gender}`,
    color && `Color: ${color}`,
    size && `Size: ${size}`,
    material && `Material: ${material}`,
    actualMinPrice != null && `Min price: $${actualMinPrice}`,
    actualMaxPrice != null && `Max price: $${actualMaxPrice}`,
    sort && `Sort: ${sort}`,
  ].filter(Boolean);

  return ok(
    `Filters applied: ${descParts.join(', ') || 'all shoes'}. Showing results on your screen.`
  );
}

async function handleClearFilters(_, socketId) {
  emit(socketId, 'navigate', { path: '/products' });
  emit(socketId, 'toast', {
    message: 'Filters cleared. Showing all products.',
    kind: 'info',
  });
  return ok('Filters cleared. Showing all products on screen.');
}

async function handleOpenCart(_, socketId) {
  emit(socketId, 'navigate', { path: '/cart' });
  return ok('Opening your cart.');
}

// ─── Product Name Confirmation Flow ─────────────────────────────────────────

/**
 * Step 1 — search_products_by_name
 * Fuzzy-search for a product by spoken name, store the top-3 candidates in
 * pendingCandidates[socketId], and tell Retell the names to read back.
 * Does NOT navigate or open anything yet.
 */
async function handleSearchProductsByName({ query } = {}, socketId) {
  if (!query?.trim()) {
    return fail('I did not catch a product name. Could you say it again?');
  }

  const result = await voiceSearch.search({ query });

  if (result.type === 'error') return fail(result.message);

  if (result.type === 'not_found') {
    pendingCandidates.delete(socketId);
    emit(socketId, 'navigate', {
      path: `/products?q=${encodeURIComponent(query)}`,
    });
    return fail(
      `I couldn't find any shoes matching "${query}". I've opened our search page on your screen.`
    );
  }

  // Always collect full list of matching products (up to 4) even if top match is high/exact
  const rawProducts =
    Array.isArray(result.products) && result.products.length > 0
      ? result.products
      : result.product
        ? [result.product]
        : [];

  if (!rawProducts.length) {
    pendingCandidates.delete(socketId);
    emit(socketId, 'navigate', { path: '/products' });
    return fail(`No matches found for "${query}".`);
  }

  const candidates = rawProducts.slice(0, 4).map((p) => {
    const score = voiceSearch.calculateNameSimilarity(query, p);
    return {
      name: p.name,
      slug: p.slug,
      price: p.price,
      brand: p.brand,
      inStock: p.inStock,
      matchScore: Math.round(score * 100),
    };
  });

  // Store so confirm_product can resolve without a second DB round-trip
  pendingCandidates.set(socketId, candidates);

  // Send exact backend search products directly via socket command in exact order (no URL query params)
  emit(socketId, 'products:override', { products: rawProducts.slice(0, 4) });
  emit(socketId, 'toast', {
    message: `Showing ${candidates.length} matching shoes on screen`,
    kind: 'info',
  });

  const topMatch = candidates[0];
  const nameList = candidates.map((c, i) => `${i + 1}. ${c.name}`).join(', ');
  const matchNotice =
    topMatch.matchScore > 0
      ? ` (top match: ${topMatch.name} at ${topMatch.matchScore}% similarity)`
      : '';

  return ok(
    `I've displayed the ${candidates.length} matching shoes on your screen${matchNotice}: ${nameList}. Which pair would you like?`,
    {
      candidates,
      count: candidates.length,
      topMatchConfidence: topMatch.matchScore,
    }
  );
}

/**
 * Step 2 — confirm_product
 * Resolves the user's spoken selection against the stored candidates for this
 * session, then performs the requested action: open (default), add_to_cart,
 * or favourite.
 */
async function handleConfirmProduct(
  { selection, action = 'open', size, color, quantity } = {},
  socketId,
  dbId
) {
  const candidates = pendingCandidates.get(socketId);

  if (!candidates?.length) {
    return fail(
      'I lost track of the products we were looking at. Could you tell me the name again?'
    );
  }

  if (!selection?.trim()) {
    return fail(
      'Which one would you like? You can say the number or part of the name.'
    );
  }

  const sel = String(selection).toLowerCase().trim();

  // 1. Try ordinal: "first", "1", "second", "2", "third", "3"
  const ORDINALS = {
    first: 0,
    1: 0,
    one: 0,
    second: 1,
    2: 1,
    two: 1,
    third: 2,
    3: 2,
    three: 2,
  };
  let resolved = null;
  if (ORDINALS[sel] !== undefined) {
    resolved = candidates[ORDINALS[sel]] || null;
  }

  // 2. Try name substring / similarity match
  if (!resolved) {
    // Exact substring first
    resolved =
      candidates.find((c) => c.name.toLowerCase().includes(sel)) || null;

    // Fuzzy similarity fallback
    if (!resolved) {
      let bestScore = 0;
      for (const c of candidates) {
        const score = voiceSearch.stringSimilarity(sel, c.name.toLowerCase());
        // Also check against just the model part (strip brand prefix)
        const modelPart = c.brand
          ? c.name.toLowerCase().replace(c.brand.toLowerCase(), '').trim()
          : c.name.toLowerCase();
        const modelScore = voiceSearch.stringSimilarity(sel, modelPart);
        const best = Math.max(score, modelScore);
        if (best > bestScore && best >= 0.45) {
          bestScore = best;
          resolved = c;
        }
      }
    }
  }

  if (!resolved) {
    const nameList = candidates.map((c, i) => `${i + 1}. ${c.name}`).join(', ');
    return fail(
      `I'm not sure which one you mean. The options are: ${nameList}. Say the number or part of the name.`,
      { candidates }
    );
  }

  // Clear candidates — session resolved
  pendingCandidates.delete(socketId);

  console.log(
    `\n✅ [CONFIRM] Resolved "${selection}" → ${resolved.name} (action: ${action})`
  );

  // Perform the requested action
  if (action === 'add_to_cart') {
    return handleAddToCart(
      {
        product_slug: resolved.slug,
        product_name: resolved.name,
        size,
        color,
        quantity,
      },
      socketId,
      dbId
    );
  }

  if (action === 'favourite') {
    return handleToggleFavourite(
      {
        product_slug: resolved.slug,
        product_name: resolved.name,
        action: 'add',
      },
      socketId,
      dbId
    );
  }

  // Default: open product detail page
  emit(socketId, 'navigate', { path: `/product/${resolved.slug}` });
  emit(socketId, 'toast', {
    message: `Opening ${resolved.name}`,
    kind: 'info',
  });
  return ok(
    `Opening ${resolved.name} by ${resolved.brand} for $${Number(resolved.price).toFixed(2)} on your screen now!`,
    { product: resolved }
  );
}

// ─── Dispatcher ──────────────────────────────────────────────────────────────

// const FUNCTION_MAP = {
//   search_product:       handleSearchProduct,
//   searchProduct:        handleSearchProduct,
//   search_products:      handleSearchProduct,
//   searchProducts:       handleSearchProduct,
//   product_search:       handleSearchProduct,
//   suggest_product:      handleSuggestProducts,
//   suggestProduct:       handleSuggestProducts,
//   suggest_products:     handleSuggestProducts,
//   suggestProducts:      handleSuggestProducts,
//   recommend_products:   handleSuggestProducts,
//   recommendProducts:    handleSuggestProducts,
//   get_suggestions:      handleSuggestProducts,

//   filter_products:      handleFilterProducts,
//   filterProducts:       handleFilterProducts,
//   apply_filters:        handleFilterProducts,
//   clear_filters:        handleClearFilters,
//   clearFilters:         handleClearFilters,
//   reset_filters:        handleClearFilters,

//   add_to_cart:          handleAddToCart,
//   addToCart:            handleAddToCart,
//   remove_from_cart:     handleRemoveFromCart,
//   removeFromCart:       handleRemoveFromCart,
//   clear_cart:           handleClearCart,
//   clearCart:            handleClearCart,
//   open_cart:            handleOpenCart,
//   openCart:             handleOpenCart,
//   view_cart:            handleOpenCart,
//   // FIX: get_cart was in Retell config but had no handler
//   get_cart:             handleGetCart,
//   getCart:              handleGetCart,
//   get_cart_summary:     handleGetCartSummary,
//   getCartSummary:       handleGetCartSummary,
//   // FIX: update_cart_quantity was in Retell config but had no handler
//   update_cart_quantity: handleUpdateCartQuantity,
//   updateCartQuantity:   handleUpdateCartQuantity,

//   toggle_favourite:     handleToggleFavourite,
//   toggleFavourite:      handleToggleFavourite,
//   add_to_wishlist:      handleToggleFavourite,
//   toggleWishlist:       handleToggleFavourite,

//   select_variant:       handleSelectVariant,
//   selectVariant:        handleSelectVariant,
//   select_color_size:    handleSelectVariant,
//   selectColorSize:      handleSelectVariant,
//   select_color:         handleSelectVariant,
//   selectColor:          handleSelectVariant,
//   select_size:          handleSelectVariant,
//   selectSize:           handleSelectVariant,
//   choose_variant:       handleSelectVariant,
//   chooseVariant:        handleSelectVariant,
//   pick_variant:         handleSelectVariant,
//   pickVariant:          handleSelectVariant,
//   customize_product:    handleSelectVariant,
//   customizeProduct:     handleSelectVariant,

//   get_current_page:     handleGetCurrentPage,
//   getCurrentPage:       handleGetCurrentPage,
//   current_page:         handleGetCurrentPage,
//   currentPage:          handleGetCurrentPage,
//   where_is_user:        handleGetCurrentPage,
//   whereIsUser:          handleGetCurrentPage,

//   navigate_to:          handleNavigateTo,
//   navigateTo:           handleNavigateTo,
//   go_to_page:           handleNavigateTo,
// }

// ─── Order Handlers ───────────────────────────────────────────────────────────

/** Formats a single order into a clean, voice-friendly summary. */
function formatOrderForVoice(order, includeItems = false) {
  if (!order) return null;

  const STATUS_LABELS = {
    pending: 'pending payment',
    confirmed: 'confirmed',
    processing: 'being processed',
    shipped: 'shipped',
    delivered: 'delivered',
    cancelled: 'cancelled',
    refunded: 'refunded',
    returned: 'returned',
  };

  const placed = order.placedAt
    ? new Date(order.placedAt).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  const result = {
    orderNumber: order.orderNumber,
    status: order.status,
    statusLabel: STATUS_LABELS[order.status] || order.status,
    total: Number(order.total || 0).toFixed(2),
    itemCount: order.itemCount ?? order.items?.length ?? 0,
    placedAt: placed,
    paymentStatus: order.paymentStatus,
  };

  // Only add tracking if shipped/delivered
  if (order.trackingNumber) result.trackingNumber = order.trackingNumber;
  if (order.courier) result.courier = order.courier;
  if (order.shippedAt)
    result.shippedAt = new Date(order.shippedAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  if (order.deliveredAt)
    result.deliveredAt = new Date(order.deliveredAt).toLocaleDateString(
      'en-US',
      { month: 'short', day: 'numeric' }
    );
  if (order.cancelledAt)
    result.cancelledAt = new Date(order.cancelledAt).toLocaleDateString(
      'en-US',
      { month: 'short', day: 'numeric' }
    );

  // Compact items list (name + size + color + qty + price)
  if (includeItems && order.items?.length) {
    result.items = order.items.map((i) => ({
      name: i.name,
      size: i.size || null,
      color: i.color || null,
      qty: i.quantity,
      unitPrice: Number(i.unitPrice || 0).toFixed(2),
      lineTotal: Number(i.lineTotal || 0).toFixed(2),
    }));
  }

  return result;
}

/**
 * get_orders — returns recent orders for the signed-in user.
 * Agent passes: limit (default 5), nth (e.g. 2 for "my 2nd order")
 */
async function handleGetOrders(
  { limit = 5, nth, status } = {},
  socketId,
  dbId
) {
  if (!dbId) return fail('You need to be signed in to view your orders.');

  try {
    const safeLimit = Math.min(Math.max(Number(limit) || 5, 1), 20);
    const { items: orders, total } = await listForUser(dbId, {
      limit: safeLimit,
      offset: 0,
    });

    if (!orders || orders.length === 0) {
      return ok('No orders found.', { orders: [], total: 0 });
    }

    // If user asked for "Nth order" (e.g. "my 3rd order")
    if (nth != null) {
      const index = Number(nth) - 1;
      if (index < 0 || index >= orders.length) {
        return fail(
          `You only have ${orders.length} order${orders.length !== 1 ? 's' : ''} in your recent history. Which one would you like?`
        );
      }
      const order = orders[index];
      const includeItems = order.items && order.items.length > 0;
      const formatted = formatOrderForVoice(order, includeItems);
      const itemNames = order.items?.length
        ? order.items
            .map(
              (i) =>
                `${i.quantity}x ${i.name}${i.size ? ` size ${i.size}` : ''}${i.color ? ` in ${i.color}` : ''}`
            )
            .join(', ')
        : null;
      return ok(
        `Your order ${formatted.orderNumber} placed on ${formatted.placedAt} is currently ${formatted.statusLabel}. Total: $${formatted.total}.${itemNames ? ` Items: ${itemNames}.` : ''}`,
        { order: formatted }
      );
    }

    // Filter by status if requested
    let filtered = orders;
    if (status) {
      filtered = orders.filter((o) => o.status === status.toLowerCase());
      if (!filtered.length) {
        return ok(`No ${status} orders found.`, { orders: [], total: 0 });
      }
    }

    const summaries = filtered.map((o) => formatOrderForVoice(o, false));
    const spoken = summaries
      .map(
        (o, i) =>
          `${i + 1}. Order ${o.orderNumber} placed ${o.placedAt} — ${o.statusLabel} — $${o.total}`
      )
      .join('; ');

    return ok(
      `You have ${total} total order${total !== 1 ? 's' : ''}. Here are your ${summaries.length} most recent: ${spoken}.`,
      { orders: summaries, total }
    );
  } catch (err) {
    logger.error({ err: err.message, dbId }, 'handleGetOrders error');
    return fail('I had trouble fetching your orders. Please try again.');
  }
}

/**
 * get_order_detail — returns full details for a specific order.
 * Agent passes: order_number (e.g. "#1023"), or order_id.
 */
async function handleGetOrderDetail(
  { order_number, order_id, nth } = {},
  socketId,
  dbId
) {
  if (!dbId) return fail('You need to be signed in to view order details.');

  try {
    let order = null;

    // Resolve by Nth position (e.g. "my most recent order", "my 2nd order")
    if (nth != null || (!order_number && !order_id)) {
      const nthIndex = nth != null ? Number(nth) - 1 : 0; // default: most recent = 1st
      const { items } = await listForUser(dbId, {
        limit: Math.max(nthIndex + 1, 1),
        offset: 0,
      });
      if (!items?.length) return fail('You have no orders yet.');
      if (nthIndex >= items.length) {
        return fail(
          `You only have ${items.length} recent order${items.length !== 1 ? 's' : ''}. Want details on order number ${items[0].orderNumber}?`
        );
      }
      order = items[nthIndex];
      // Re-fetch full detail (listForUser already includes items)
    } else {
      // Resolve by order number or public id
      const lookup = order_number || order_id;
      // Try fetching with ownership check skipped — we verify ownership via dbId below
      const user = await findByPublicId(socketId);
      order = await getOrder(lookup, user);
    }

    if (!order)
      return fail(
        'I could not find that order. Please check the order number and try again.'
      );

    const formatted = formatOrderForVoice(order, true);
    const itemDesc = order.items?.length
      ? order.items
          .map(
            (i) =>
              `${i.quantity}x ${i.name}${i.size ? ` size ${i.size}` : ''}${i.color ? ` in ${i.color}` : ''} ($${Number(i.lineTotal || 0).toFixed(2)})`
          )
          .join(', ')
      : 'no items';

    let spokenStatus = `Order ${formatted.orderNumber} placed on ${formatted.placedAt} is ${formatted.statusLabel}.`;
    if (formatted.trackingNumber)
      spokenStatus += ` Tracking: ${formatted.trackingNumber} via ${formatted.courier || 'courier'}.`;
    if (formatted.shippedAt)
      spokenStatus += ` Shipped on ${formatted.shippedAt}.`;
    if (formatted.deliveredAt)
      spokenStatus += ` Delivered on ${formatted.deliveredAt}.`;
    if (formatted.cancelledAt)
      spokenStatus += ` Cancelled on ${formatted.cancelledAt}.`;
    spokenStatus += ` Items: ${itemDesc}. Total: $${formatted.total}.`;

    // Navigate user to order details page
    emit(socketId, 'navigate', {
      path: `/orders/${order.id || order.publicId}`,
    });

    return ok(spokenStatus, { order: formatted });
  } catch (err) {
    logger.error({ err: err.message, dbId }, 'handleGetOrderDetail error');
    if (err.statusCode === 404 || err.message?.includes('not found')) {
      return fail(
        'I could not find that order. Please check the order number.'
      );
    }
    return fail('I had trouble fetching that order. Please try again.');
  }
}

// ─── Dispatcher ──────────────────────────────────────────────────────────────

const FUNCTION_MAP = {
  // Product Name Confirmation Flow (2-step: search → confirm)
  search_products_by_name: handleSearchProductsByName,
  confirm_product: handleConfirmProduct,

  // Search & Recommendations
  search_product: handleSearchProduct,
  suggest_product: handleSuggestProducts,

  // Cart
  add_to_cart: handleAddToCart,
  remove_from_cart: handleRemoveFromCart,
  clear_cart: handleClearCart,
  get_cart: handleGetCart,
  get_cart_summary: handleGetCartSummary,
  update_cart_quantity: handleUpdateCartQuantity,
  open_cart: handleOpenCart,

  // Products & Variants
  filter_products: handleFilterProducts,
  clear_filters: handleClearFilters,
  select_variant: handleSelectVariant,
  toggle_favourite: handleToggleFavourite,

  // Navigation & Page State
  navigate_to: handleNavigateTo,
  get_current_page: handleGetCurrentPage,

  // Orders
  get_orders: handleGetOrders,
  get_order_detail: handleGetOrderDetail,
};

// FIX: dispatch resolves dbId ONCE here and passes it to every handler.
// Previously each handler called resolveDbUserId independently = N DB queries per call.
export async function dispatch(functionName, args, socketId) {
  const rawName = String(functionName || '').trim();
  const normalizedName = rawName
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .toLowerCase();

  const handler = FUNCTION_MAP[normalizedName] || FUNCTION_MAP[rawName];

  if (!handler) {
    logger.warn({ functionName, socketId }, 'unknown retell function called');
    return fail(`I don't know how to handle "${functionName}" yet.`);
  }

  // Resolve ULID → internalId once per dispatch, share with all handlers
  const dbId = await resolveDbUserId(socketId);

  logger.info(
    { functionName, args, socketId, dbId },
    '[RetellFunction] dispatching'
  );

  try {
    const result = await Promise.race([
      handler(args || {}, socketId, dbId),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error('Function timeout after 5 seconds')),
          5000
        )
      ),
    ]);
    return result;
  } catch (err) {
    logger.error(
      { err: err.message, functionName, socketId },
      '[RetellFunction] handler error'
    );
    return fail('Something went wrong. Please try again.');
  }
}
