import * as cartService from '../services/cart.service.js'
import * as favouriteService from '../services/favourite.service.js'
import * as voiceSearch from '../services/voice-search.service.js'
import { getPublicBySlug } from '../services/product.service.js'
import { getPageState } from '../services/session-state.service.js'
import { emitToUser } from '../config/socket.js'
import { logger } from '../config/logger.js'
import { findByPublicId } from '../models/user.model.js'

// ─── Helpers ────────────────────────────────────────────────────────────────

// ULIDs are 26-char alphanumeric public_ids used in the API / socket layer.
// DB tables store the internal BIGINT id in user_id columns.
// This helper resolves the ULID → internalId so all service/model calls use
// the correct type. The original ULID is kept for socket emits.
const ULID_RE = /^[0-9A-HJKMNP-TV-Z]{26}$/i
async function resolveDbUserId(publicId) {
  if (!publicId || publicId === 'guest') return null
  if (ULID_RE.test(String(publicId))) {
    const user = await findByPublicId(publicId)
    return user?.internalId ?? null
  }
  // Already an internal numeric id (e.g. from REST middleware)
  return publicId
}

function emit(userId, type, payload = {}) {
  try {
    console.log(`\n🖥️ [BACKEND -> FRONTEND] Task: "${type}"`)
    if (payload.path) console.log(`   Navigate Path: ${payload.path}`)
    if (payload.message) console.log(`   Toast Notification: "${payload.message}"`)
    emitToUser(userId, 'ui:command', { type, payload, timestamp: Date.now() })
  } catch (err) {
    // socket emit error handled silently
  }
}

function ok(message, data = {}) {
  return { success: true, message, ...data }
}

function fail(message, extra = {}) {
  return { success: false, message, ...extra }
}

// ─── Variant Selection Helpers ───────────────────────────────────────────────

function normalizeColor(product, rawColor) {
  if (!product?.variants?.length || rawColor === undefined || rawColor === null || rawColor === '') return null
  const target = String(rawColor).trim().toLowerCase()
  const colors = [...new Set(product.variants.map((v) => v.color).filter(Boolean))]

  const exact = colors.find((c) => c.toLowerCase() === target)
  if (exact) return exact

  const synonyms = { gray: 'grey', grey: 'gray', 'off-white': 'white', cream: 'beige' }
  const swapped = synonyms[target]
  if (swapped) {
    const match = colors.find((c) => c.toLowerCase() === swapped)
    if (match) return match
  }

  const partial = colors.find((c) => c.toLowerCase().includes(target) || target.includes(c.toLowerCase()))
  return partial || null
}

function normalizeSize(product, rawSize) {
  if (!product?.variants?.length || rawSize === undefined || rawSize === null || rawSize === '') return null
  const target = String(rawSize).trim()
  const sizes = [...new Set(product.variants.map((v) => String(v.size)).filter(Boolean))]

  const exact = sizes.find((s) => s === target)
  if (exact) return exact

  const num = parseFloat(target)
  if (!Number.isNaN(num)) {
    const numeric = sizes.find((s) => parseFloat(s) === num)
    if (numeric) return numeric
  }
  return null
}

function isVariantInStock(variant) {
  return Boolean(variant?.inStock ?? Number(variant?.available ?? 0) > 0)
}

// FIX #1: selectionRedirectArgs — was too aggressive; only redirect when the
// user is already on a product page AND the text has NO new product name intent.
function selectionRedirectArgs(args, userId) {
  const tracked = getPageState(userId)
  if (tracked?.type !== 'product' || !tracked.slug) return null
  if (args.product_name || args.product_id) return null

  const text = String(args.query || args.q || '').toLowerCase()
  const extractedColor = args.color || voiceSearch.extractColor(text)
  const extractedSize = args.size || voiceSearch.extractSize(text)
  if (!extractedColor && !extractedSize) return null

  const hasOtherFilter = Boolean(args.category || args.brand || args.material || args.gender) ||
    Boolean(voiceSearch.extractCategory(text) || voiceSearch.extractBrand(text) || voiceSearch.extractMaterial(text) || voiceSearch.extractGender(text))
  const hasPrice = [args.min_price, args.max_price, args.price_min, args.price_max]
    .some((v) => v !== undefined && v !== null)
  if (hasOtherFilter || hasPrice) return null

  const selectionVerb = /\b(select|pick|choose|switch|change|make it|go with|i want|i'll take|put me in|swap|try|grab)\b/i.test(text)
  const browseWord = /\b(show|find|browse|search|looking|list|suggest|recommend|any|some|best|cheap|under|over|need)\b/i.test(text)

  if (selectionVerb || !browseWord) {
    return { color: extractedColor, size: extractedSize }
  }
  return null
}

// ─── Function Handlers ───────────────────────────────────────────────────────

async function handleSearchProduct(args = {}, userId) {
  logger.info({ args, userId }, '[RetellHandler] handleSearchProduct invoked')

  const selectionArgs = selectionRedirectArgs(args, userId)
  if (selectionArgs) {
    return handleSelectVariant(selectionArgs, userId)
  }

  const result = await voiceSearch.search(args)

  if (result.type === 'not_found') {
    emit(userId, 'navigate', { path: result.navigateTo || '/products' })
    emit(userId, 'toast', { message: result.message, kind: 'info' })
    return ok(result.message, {
      total: 0,
      navigateTo: result.navigateTo || '/products',
    })
  }

  if (result.type === 'error') {
    return fail(result.message)
  }

  if (result.type === 'exact') {
    emit(userId, 'navigate', { path: `/product/${result.product.slug}` })
    emit(userId, 'toast', { message: `Opening ${result.product.name}`, kind: 'info' })
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
    })
  }

  emit(userId, 'navigate', { path: result.navigateTo })
  emit(userId, 'toast', { message: result.toastMessage || result.message, kind: 'info' })

  return ok(result.message, {
    total: result.total,
    navigateTo: result.navigateTo,
    products: (result.products || []).slice(0, 6).map(p => ({
      name: p.name,
      brand: p.brand,
      price: p.price,
      slug: p.slug,
      material: p.material,
      gender: p.gender,
    })),
  })
}

async function handleSuggestProducts(args = {}, userId) {
  const suggestionArgs = typeof args === 'string'
    ? { query: `suggest ${args}`, isSuggestion: true }
    : { ...args, isSuggestion: true }
  return handleSearchProduct(suggestionArgs, userId)
}

async function handleAddToCart({ product_id, product_slug, product_name, size, color, quantity = 1 }, userId) {
  if (!userId || userId === 'guest') {
    return fail('Please sign in to add items to your cart.')
  }

  const dbUserId = await resolveDbUserId(userId)
  if (!dbUserId) return fail('Could not identify your account. Please sign in again.')

  try {
    // ── 1. Resolve product ───────────────────────────────────────────────────
    let product = null
    let tracked = getPageState(userId)

    if (product_slug) {
      product = await getPublicBySlug(product_slug)
    } else if (product_name) {
      const result = await voiceSearch.search({ query: product_name })
      if (result.type === 'exact') product = result.product
    } else if (product_id) {
      const result = await voiceSearch.search({ query: product_id })
      product = result.product || null
    } else if (tracked?.type === 'product' && tracked.slug) {
      // No product identifier from agent — use whatever is open on screen
      product = await getPublicBySlug(tracked.slug)
    }

    if (!product) {
      return fail('I could not find that product. Please search for a shoe first, then say "add to cart".')
    }

    if (!product.inStock) {
      return fail(`Sorry, ${product.name} is currently out of stock.`)
    }

    // ── 2. Inherit size/color from the tracked page state when agent omits them
    // This is the core fix: after the user says "select blue size 40" and the
    // variant:select event fires, the client reports the selection back via
    // page:update → setPageState. So when the agent calls add_to_cart with {}
    // we can read size/color right here instead of asking the user again.
    if (tracked?.type === 'product' && tracked.slug === product.slug) {
      if (!size && tracked.size) size = tracked.size
      if (!color && tracked.color) color = tracked.color
    }

    // ── 3. Validate size/color before attempting findVariant ─────────────────
    const availableSizes = [...new Set(product.variants?.filter(isVariantInStock).map(v => String(v.size)))].sort((a, b) => Number(a) - Number(b))
    const availableColors = [...new Set(product.variants?.filter(isVariantInStock).map(v => v.color).filter(Boolean))]

    if (!size && availableSizes.length > 1) {
      return fail(
        `What size do you want for ${product.name}? Available sizes: ${availableSizes.join(', ')}.`,
        { availableSizes, availableColors }
      )
    }

    const variant = voiceSearch.findVariant(product, size, color)

    if (!variant) {
      let msg = `I couldn't find ${product.name}`
      if (size) msg += ` in size ${size}`
      if (color) msg += ` in ${color}`
      msg += `.`
      if (availableSizes.length) msg += ` Available sizes: ${availableSizes.join(', ')}.`
      if (availableColors.length) msg += ` Available colors: ${availableColors.join(', ')}.`
      return fail(msg, { availableSizes, availableColors })
    }

    // ── 4. Add to cart ───────────────────────────────────────────────────
    await cartService.addItem(dbUserId, { variantId: variant.id, quantity: Math.min(quantity, 10) })

    emit(userId, 'cart:refresh', {})
    emit(userId, 'toast', {
      message: `Added ${product.name}${size ? ` size ${size}` : ''}${color ? ` in ${color}` : ''} to your cart.`,
      kind: 'success',
    })

    return ok(`Added ${product.name}${size ? ` size ${size}` : ''}${color ? ` in ${color}` : ''} to your cart!`)
  } catch (err) {
    logger.error({ err: err.message, userId }, 'handleAddToCart error')

    // ── 5. Sanitize DB/internal errors — never speak raw SQL to the user ─────
    const rawMsg = err.message || ''
    const isDbError = /truncated|column|row \d|sql|duplicate entry|constraint/i.test(rawMsg)
    if (isDbError) {
      logger.error({ rawMsg, userId }, '[handleAddToCart] DB error — check user_id column length or schema')
      return fail('Something went wrong adding to your cart. Please try again.')
    }

    // Known domain errors (stock, unavailable) are safe to surface
    return fail(rawMsg || 'Failed to add item to cart. Please try again.')
  }
}

// FIX #5: handleRemoveFromCart — support product_name lookup as fallback
// when the agent only has a name (not variant_id). The old code returned
// a silent fail("Please specify which item to remove") in that case.
async function handleRemoveFromCart({ product_name, variant_id, product_slug }, userId) {
  if (!userId || userId === 'guest') return fail('Please sign in first.')
  const dbUserId = await resolveDbUserId(userId)
  if (!dbUserId) return fail('Could not identify your account. Please sign in again.')

  try {
    // Resolve variant_id from name/slug if not provided directly
    if (!variant_id && (product_name || product_slug)) {
      const items = await cartService.get(dbUserId)
      const needle = (product_name || product_slug || '').toLowerCase()
      const match = items.find(i =>
        i.name?.toLowerCase().includes(needle) ||
        i.slug?.toLowerCase() === needle
      )
      if (!match) {
        return fail(
          `I don't see ${product_name || product_slug} in your cart. Say "show my cart" to check what's in there.`
        )
      }
      variant_id = match.variantId || match.variant_id
    }

    if (!variant_id) {
      return fail('Please tell me which item you want to remove, or say "show my cart" to check what\'s in there.')
    }

    await cartService.removeItem(dbUserId, variant_id)
    emit(userId, 'cart:refresh', {})
    emit(userId, 'toast', { message: 'Item removed from cart.', kind: 'info' })
    return ok('Done, item removed from your cart.')
  } catch (err) {
    logger.error({ err: err.message }, 'handleRemoveFromCart error')
    return fail('Failed to remove item. Please try again.')
  }
}

async function handleClearCart(_, userId) {
  if (!userId || userId === 'guest') return fail('Please sign in first.')
  const dbUserId = await resolveDbUserId(userId)
  if (!dbUserId) return fail('Could not identify your account. Please sign in again.')
  try {
    await cartService.clear(dbUserId)
    emit(userId, 'cart:refresh', {})
    emit(userId, 'toast', { message: 'Cart cleared.', kind: 'info' })
    return ok('Your cart has been cleared.')
  } catch (err) {
    return fail('Failed to clear cart.')
  }
}

// FIX #6: handleToggleFavourite — resolve product from tracked page when no
// slug given, same pattern as add-to-cart fix.
async function handleToggleFavourite({ product_slug, product_name, action }, userId) {
  if (!userId || userId === 'guest') return fail('Please sign in to save favourites.')
  const dbUserId = await resolveDbUserId(userId)
  if (!dbUserId) return fail('Could not identify your account. Please sign in again.')

  try {
    let product = null
    if (product_slug) {
      product = await getPublicBySlug(product_slug)
    } else if (product_name) {
      const result = await voiceSearch.search({ query: product_name })
      if (result.type === 'exact') product = result.product
    } else {
      const tracked = getPageState(userId)
      if (tracked?.type === 'product' && tracked.slug) {
        product = await getPublicBySlug(tracked.slug)
      }
    }

    if (!product) return fail('Could not find that product. Which shoe do you want to save?')

    const favourites = await favouriteService.get(dbUserId)
    const isSaved = favourites.some(f => f.id === product.id || f.slug === product.slug)

    if (action === 'add' || (!action && !isSaved)) {
      await favouriteService.add(dbUserId, product.id)
      emit(userId, 'wishlist:refresh', {})
      emit(userId, 'toast', { message: `${product.name} saved to favourites.`, kind: 'success' })
      return ok(`${product.name} has been saved to your favourites.`)
    } else {
      await favouriteService.remove(dbUserId, product.id)
      emit(userId, 'wishlist:refresh', {})
      emit(userId, 'toast', { message: `${product.name} removed from favourites.`, kind: 'info' })
      return ok(`${product.name} has been removed from your favourites.`)
    }
  } catch (err) {
    logger.error({ err: err.message }, 'handleToggleFavourite error')
    return fail('Failed to update favourites.')
  }
}

async function handleSelectVariant({ product_slug, product_id, product_name, color, size }, userId) {
  try {
    const tracked = getPageState(userId)

    let product = null
    let source = 'agent'
    if (product_slug) {
      product = await getPublicBySlug(product_slug)
    } else if (product_name) {
      const result = await voiceSearch.search({ query: product_name })
      product = result.type === 'exact' ? result.product : null
    } else if (product_id) {
      const result = await voiceSearch.search({ query: product_id })
      product = result.product || null
    } else if (tracked?.type === 'product' && tracked.slug) {
      product = await getPublicBySlug(tracked.slug)
      source = 'tracked'
    }

    const pageInfo = tracked
      ? { type: tracked.type, path: tracked.path, slug: tracked.slug, color: tracked.color, size: tracked.size }
      : null

    if (!product) {
      const where = tracked?.type && tracked.type !== 'unknown'
        ? `The customer is on the ${tracked.type === 'product' ? 'product' : tracked.path || tracked.type} page`
        : 'I cannot see a product page on the customer\'s screen right now'
      return fail(
        `${where}. To select a color or size, open a product first (or ask which shoe they want), or use filter_products to narrow the catalog.`,
        { page: pageInfo }
      )
    }

    const availableColors = [...new Set(product.variants?.filter(isVariantInStock).map((v) => v.color).filter(Boolean))]
    const availableSizes = [...new Set(product.variants?.filter(isVariantInStock).map((v) => String(v.size)).filter(Boolean))]
      .sort((a, b) => Number(a) - Number(b))

    const wantsColor = color !== undefined && color !== null && String(color).trim() !== ''
    const wantsSize = size !== undefined && size !== null && String(size).trim() !== ''

    if (!wantsColor && !wantsSize) {
      return ok(`${product.name} is on your screen. Available colors: ${availableColors.join(', ') || 'none'}. Available sizes: ${availableSizes.join(', ') || 'none'}.`, {
        product: { slug: product.slug, name: product.name },
        colors: availableColors,
        sizes: availableSizes,
        source,
      })
    }

    const trackedColor = tracked?.type === 'product' && tracked.slug === product.slug ? tracked.color : null

    let canonicalColor = null
    if (wantsColor) {
      canonicalColor = normalizeColor(product, color)
      if (!canonicalColor) {
        return fail(`${product.name} does not come in that color. Available colors: ${availableColors.join(', ') || 'none right now'}.`, {
          availableColors,
          availableSizes,
          page: pageInfo,
        })
      }
      if (!availableColors.some((c) => c.toLowerCase() === canonicalColor.toLowerCase())) {
        return fail(`${canonicalColor} is currently out of stock for ${product.name}. Available colors: ${availableColors.join(', ') || 'none right now'}.`, {
          availableColors,
          availableSizes,
          page: pageInfo,
        })
      }
    }

    let canonicalSize = null
    if (wantsSize) {
      canonicalSize = normalizeSize(product, size)
      if (!canonicalSize) {
        return fail(`${product.name} does not come in size ${String(size).trim()}. Available sizes: ${availableSizes.join(', ') || 'none right now'}.`, {
          availableColors,
          availableSizes,
          page: pageInfo,
        })
      }

      const effectiveColor = canonicalColor || trackedColor
      if (effectiveColor) {
        const variant = product.variants.find((v) =>
          String(v.color).toLowerCase() === effectiveColor.toLowerCase() && String(v.size) === canonicalSize
        )
        if (!variant || !isVariantInStock(variant)) {
          const sizesForColor = [...new Set(product.variants
            .filter((v) => String(v.color).toLowerCase() === effectiveColor.toLowerCase() && isVariantInStock(v))
            .map((v) => String(v.size)))].sort((a, b) => Number(a) - Number(b))
          return fail(`Size ${canonicalSize} is not available in ${effectiveColor}. Available sizes in ${effectiveColor}: ${sizesForColor.join(', ') || 'none right now'}.`, {
            availableColors,
            availableSizes,
            page: pageInfo,
          })
        }
      } else {
        const inStockAnywhere = product.variants.some((v) => String(v.size) === canonicalSize && isVariantInStock(v))
        if (!inStockAnywhere) {
          return fail(`Size ${canonicalSize} is currently out of stock for ${product.name}. Available sizes: ${availableSizes.join(', ') || 'none right now'}.`, {
            availableColors,
            availableSizes,
            page: pageInfo,
          })
        }
      }
    }

    const payload = { slug: product.slug }
    if (canonicalColor) payload.color = canonicalColor
    if (canonicalSize) payload.size = canonicalSize
    emit(userId, 'variant:select', payload)

    const chosenParts = [canonicalColor, canonicalSize && `size ${canonicalSize}`].filter(Boolean)
    return ok(`Selected ${product.name}${chosenParts.length ? ` in ${chosenParts.join(', ')}` : ''}.`, {
      product: { slug: product.slug, name: product.name },
      color: canonicalColor || null,
      size: canonicalSize || null,
      source,
    })
  } catch (err) {
    logger.error({ err: err.message, userId }, 'handleSelectVariant error')
    return fail('Could not select that color and size. Please try again.')
  }
}

async function handleGetCurrentPage(_, userId) {
  const tracked = getPageState(userId)
  if (!tracked || tracked.type === 'unknown') {
    return ok('I do not have a live reading of which page the customer is viewing right now.', { page: null })
  }

  let description
  if (tracked.type === 'product') {
    let name = tracked.slug
    try {
      const product = await getPublicBySlug(tracked.slug)
      if (product) name = product.name
    } catch { /* keep slug as fallback name */ }
    const selection = [tracked.color, tracked.size && `size ${tracked.size}`].filter(Boolean).join(', ')
    description = `the product page for ${name}${selection ? ` with ${selection} selected` : ''}`
  } else if (tracked.type === 'catalog') {
    description = 'the product catalog page'
  } else {
    description = `the ${tracked.path || tracked.type} page`
  }

  return ok(`The customer is on ${description}.`, {
    page: {
      type: tracked.type,
      path: tracked.path,
      slug: tracked.slug,
      color: tracked.color || null,
      size: tracked.size || null,
    },
  })
}

async function handleNavigateTo({ page }, userId) {
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
  }

  const path = PAGES[page?.toLowerCase()]
  if (!path) return fail(`I don't know how to navigate to "${page}". Try: home, products, cart, profile, or orders.`)

  emit(userId, 'navigate', { path })
  return ok(`Navigating to ${page}.`)
}

// FIX #7: handleFilterProducts — removed duplicate URLSearchParams.set calls.
// The original code set color, size, gender, priceMin, priceMax, category TWICE
// which polluted the query string and sometimes produced double values.
async function handleFilterProducts(args = {}, userId) {
  const selectionArgs = selectionRedirectArgs(args, userId)
  if (selectionArgs) {
    return handleSelectVariant(selectionArgs, userId)
  }

  let { color, size, gender, min_price, max_price, price_min, price_max, sort, category, brand, material, query, q } = args
  const rawText = [query, q, brand, category, material].filter(Boolean).join(' ')

  if (!brand) brand = voiceSearch.extractBrand(rawText)
  if (!category) {
    const extractedCat = voiceSearch.extractCategory(rawText)
    if (extractedCat) category = extractedCat.slug
  }
  if (!gender) gender = voiceSearch.extractGender(rawText)
  if (!color) color = voiceSearch.extractColor(rawText)
  if (!material) material = voiceSearch.extractMaterial(rawText)

  const actualMinPrice = min_price ?? price_min
  const actualMaxPrice = max_price ?? price_max

  // Build params once — no duplicates
  const params = new URLSearchParams()
  if (category) params.set('category', category)
  if (gender) params.set('gender', gender)
  if (color) params.set('color', color)
  if (size) params.set('size', String(size))
  if (actualMinPrice !== undefined && actualMinPrice !== null) params.set('priceMin', String(actualMinPrice))
  if (actualMaxPrice !== undefined && actualMaxPrice !== null) params.set('priceMax', String(actualMaxPrice))

  if (brand) {
    params.set('q', brand)
  } else if (query && query.trim()) {
    const cleanQ = query.toLowerCase()
      .replace(/\b(running|sneakers|casual|formal|boots|basketball|outdoor|training|shoes|shoe|for|in|men|women|unisex|kids)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim()
    if (cleanQ) params.set('q', cleanQ)
  }

  const SORT_MAP = {
    price_asc: 'price_asc',
    price_desc: 'price_desc',
    lowest: 'price_asc',
    highest: 'price_desc',
    newest: 'newest',
    popular: 'popular',
    rating: 'rating',
  }
  if (sort) params.set('sort', SORT_MAP[sort] || sort)

  const path = `/products?${params.toString()}`
  emit(userId, 'navigate', { path })
  emit(userId, 'toast', { message: 'Filters applied. Showing matching products.', kind: 'info' })

  // Build a clean human-readable description (no duplicates)
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
  ].filter(Boolean)

  return ok(`Filters applied: ${descParts.join(', ') || 'all shoes'}. Showing results on your screen.`)
}

async function handleClearFilters(_, userId) {
  emit(userId, 'navigate', { path: '/products' })
  emit(userId, 'toast', { message: 'Filters cleared. Showing all products.', kind: 'info' })
  return ok('Filters cleared. Showing all products on screen.')
}

async function handleOpenCart(_, userId) {
  emit(userId, 'navigate', { path: '/cart' })
  return ok('Opening your cart.')
}

async function handleGetCartSummary(_, userId) {
  if (!userId || userId === 'guest') return fail('Please sign in to view your cart.')
  const dbUserId = await resolveDbUserId(userId)
  if (!dbUserId) return fail('Could not identify your account.')
  try {
    const items = await cartService.get(dbUserId)
    if (!items.length) return ok('Your cart is empty.')
    const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0)
    const summary = items.map(i => `${i.name} x${i.quantity}`).join(', ')
    return ok(`You have ${items.length} item${items.length > 1 ? 's' : ''} in your cart: ${summary}. Total: $${total.toFixed(2)}.`)
  } catch (err) {
    return fail('Could not retrieve your cart.')
  }
}

// ─── Main Dispatcher ─────────────────────────────────────────────────────────
// FIX #8: Removed all duplicate keys from FUNCTION_MAP.
// JS objects silently keep only the LAST value for a duplicate key, so the
// first block of aliases at the top was being shadowed by the smaller repeat
// block at the bottom — making the aliases unreachable during debugging.

const FUNCTION_MAP = {
  // Search & suggestions
  search_product: handleSearchProduct,
  searchProduct: handleSearchProduct,
  search_products: handleSearchProduct,
  searchProducts: handleSearchProduct,
  product_search: handleSearchProduct,
  suggest_product: handleSuggestProducts,
  suggestProduct: handleSuggestProducts,
  suggest_products: handleSuggestProducts,
  suggestProducts: handleSuggestProducts,
  recommend_products: handleSuggestProducts,
  recommendProducts: handleSuggestProducts,
  get_suggestions: handleSuggestProducts,

  // Filters & catalogue navigation
  filter_products: handleFilterProducts,
  filterProducts: handleFilterProducts,
  apply_filters: handleFilterProducts,
  clear_filters: handleClearFilters,
  clearFilters: handleClearFilters,
  reset_filters: handleClearFilters,

  // Cart operations
  add_to_cart: handleAddToCart,
  addToCart: handleAddToCart,
  remove_from_cart: handleRemoveFromCart,
  removeFromCart: handleRemoveFromCart,
  clear_cart: handleClearCart,
  clearCart: handleClearCart,
  open_cart: handleOpenCart,
  openCart: handleOpenCart,
  view_cart: handleOpenCart,
  get_cart_summary: handleGetCartSummary,
  getCartSummary: handleGetCartSummary,

  // Favourites & general navigation
  toggle_favourite: handleToggleFavourite,
  toggleFavourite: handleToggleFavourite,
  add_to_wishlist: handleToggleFavourite,
  toggleWishlist: handleToggleFavourite,

  // Product variant selection
  select_variant: handleSelectVariant,
  selectVariant: handleSelectVariant,
  select_color_size: handleSelectVariant,
  selectColorSize: handleSelectVariant,
  select_color: handleSelectVariant,
  selectColor: handleSelectVariant,
  select_size: handleSelectVariant,
  selectSize: handleSelectVariant,
  choose_variant: handleSelectVariant,
  chooseVariant: handleSelectVariant,
  pick_variant: handleSelectVariant,
  pickVariant: handleSelectVariant,
  customize_product: handleSelectVariant,
  customizeProduct: handleSelectVariant,

  // Current page awareness
  get_current_page: handleGetCurrentPage,
  getCurrentPage: handleGetCurrentPage,
  current_page: handleGetCurrentPage,
  currentPage: handleGetCurrentPage,
  where_is_user: handleGetCurrentPage,
  whereIsUser: handleGetCurrentPage,

  // Navigation
  navigate_to: handleNavigateTo,
  navigateTo: handleNavigateTo,
  go_to_page: handleNavigateTo,
}

export async function dispatch(functionName, args, userId) {
  const handler = FUNCTION_MAP[functionName]

  if (!handler) {
    logger.warn({ functionName, userId }, 'unknown retell function called')
    return fail(`I don't know how to handle "${functionName}" yet.`)
  }

  logger.info({ functionName, args, userId }, '[RetellFunction] dispatching')

  try {
    const result = await Promise.race([
      handler(args || {}, userId),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Function timeout after 5 seconds')), 5000)
      ),
    ])
    return result
  } catch (err) {
    logger.error({ err: err.message, functionName, userId }, '[RetellFunction] handler error')
    return fail('Something went wrong. Please try again.')
  }
}