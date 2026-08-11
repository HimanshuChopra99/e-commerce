import * as cartService from '../services/cart.service.js'
import * as favouriteService from '../services/favourite.service.js'
import * as voiceSearch from '../services/voice-search.service.js'
import { getPublicBySlug } from '../services/product.service.js'
import { getPageState } from '../services/session-state.service.js'
import { emitToUser } from '../config/socket.js'
import { logger } from '../config/logger.js'
import { findByPublicId } from '../models/user.model.js'

// ─── ID Resolution ───────────────────────────────────────────────────────────
// FIX #1: Resolve ULID once per dispatch call, not once per handler.
// All socket emits use socketId (ULID) — page state and socket rooms are keyed by it.
// All DB writes use dbId (BIGINT internalId) — cart_items.user_id is BIGINT FK.

const ULID_RE = /^[0-9A-HJKMNP-TV-Z]{26}$/i

async function resolveDbUserId(publicId) {
  if (!publicId || publicId === 'guest') return null
  if (!ULID_RE.test(String(publicId))) return publicId // already a numeric id
  try {
    const user = await findByPublicId(publicId)
    return user?.internalId ?? null
  } catch (err) {
    logger.warn({ err: err.message, publicId }, '[RetellFunctions] resolveDbUserId failed')
    return null
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function emit(socketId, type, payload = {}) {
  try {
    console.log(`\n🖥️ [BACKEND -> FRONTEND] Task: "${type}"`)
    if (payload.path)    console.log(`   Navigate Path: ${payload.path}`)
    if (payload.message) console.log(`   Toast Notification: "${payload.message}"`)
    emitToUser(socketId, 'ui:command', { type, payload, timestamp: Date.now() })
  } catch { /* silent */ }
}

function ok(message, data = {})     { return { success: true,  message, ...data } }
function fail(message, extra = {})  { return { success: false, message, ...extra } }

// ─── Variant Helpers ──────────────────────────────────────────────────────────

function normalizeColor(product, rawColor) {
  if (!product?.variants?.length || rawColor == null || rawColor === '') return null
  const target = String(rawColor).trim().toLowerCase()
  const colors = [...new Set(product.variants.map(v => v.color).filter(Boolean))]

  const exact = colors.find(c => c.toLowerCase() === target)
  if (exact) return exact

  const synonyms = { gray: 'grey', grey: 'gray', 'off-white': 'white', cream: 'beige' }
  if (synonyms[target]) {
    const match = colors.find(c => c.toLowerCase() === synonyms[target])
    if (match) return match
  }

  return colors.find(c => c.toLowerCase().includes(target) || target.includes(c.toLowerCase())) || null
}

function normalizeSize(product, rawSize) {
  if (!product?.variants?.length || rawSize == null || rawSize === '') return null
  const target = String(rawSize).trim()
  const sizes = [...new Set(product.variants.map(v => String(v.size)).filter(Boolean))]

  const exact = sizes.find(s => s === target)
  if (exact) return exact

  const num = parseFloat(target)
  if (!Number.isNaN(num)) {
    return sizes.find(s => parseFloat(s) === num) || null
  }
  return null
}

// FIX #2: isVariantInStock checks both inStock and available fields.
// toPublicVariant sets `available` but NOT `inStock`, so the old check
// (v.inStock) always returned false for variants from getPublicBySlug.
function isVariantInStock(variant) {
  if (!variant) return false
  if (variant.inStock !== undefined) return Boolean(variant.inStock)
  return Number(variant.available ?? 0) > 0
}

// FIX #3: findVariantLocal — replaces voiceSearch.findVariant for handlers
// that already have the product object. voiceSearch.findVariant only checks
// v.inStock which is undefined on public API shapes. This checks both fields.
function findVariantLocal(product, size, color) {
  if (!product?.variants?.length) return null
  return product.variants.find(v =>
    (!size  || String(v.size)  === String(size)) &&
    (!color || v.color?.toLowerCase() === color.toLowerCase()) &&
    isVariantInStock(v)
  ) || null
}

function selectionRedirectArgs(args, socketId) {
  const tracked = getPageState(socketId)
  if (tracked?.type !== 'product' || !tracked.slug) return null
  if (args.product_name || args.product_id) return null

  const text = String(args.query || args.q || '').toLowerCase()
  const extractedColor = args.color || voiceSearch.extractColor(text)
  const extractedSize  = args.size  || voiceSearch.extractSize(text)
  if (!extractedColor && !extractedSize) return null

  const hasOtherFilter = Boolean(args.category || args.brand || args.material || args.gender) ||
    Boolean(voiceSearch.extractCategory(text) || voiceSearch.extractBrand(text) ||
            voiceSearch.extractMaterial(text) || voiceSearch.extractGender(text))
  const hasPrice = [args.min_price, args.max_price, args.price_min, args.price_max]
    .some(v => v !== undefined && v !== null)
  if (hasOtherFilter || hasPrice) return null

  const selectionVerb = /\b(select|pick|choose|switch|change|make it|go with|i want|i'll take|put me in|swap|try|grab)\b/i.test(text)
  const browseWord    = /\b(show|find|browse|search|looking|list|suggest|recommend|any|some|best|cheap|under|over|need)\b/i.test(text)

  return (selectionVerb || !browseWord) ? { color: extractedColor, size: extractedSize } : null
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

async function handleSearchProduct(args = {}, socketId) {
  logger.info({ args, socketId }, '[RetellHandler] handleSearchProduct invoked')

  const selectionArgs = selectionRedirectArgs(args, socketId)
  if (selectionArgs) return handleSelectVariant(selectionArgs, socketId)

  const result = await voiceSearch.search(args)

  if (result.type === 'not_found') {
    emit(socketId, 'navigate', { path: result.navigateTo || '/products' })
    emit(socketId, 'toast', { message: result.message, kind: 'info' })
    return ok(result.message, { total: 0, navigateTo: result.navigateTo || '/products' })
  }

  if (result.type === 'error') return fail(result.message)

  if (result.type === 'exact') {
    emit(socketId, 'navigate', { path: `/product/${result.product.slug}` })
    emit(socketId, 'toast', { message: `Opening ${result.product.name}`, kind: 'info' })
    return ok(result.message, {
      product: {
        id:       result.product.id,
        name:     result.product.name,
        brand:    result.product.brand,
        price:    result.product.price,
        slug:     result.product.slug,
        material: result.product.material,
        gender:   result.product.gender,
        inStock:  result.product.inStock,
        sizes:    result.product.sizes || [],
        colors:   result.product.colors || [],
      },
    })
  }

  emit(socketId, 'navigate', { path: result.navigateTo })
  emit(socketId, 'toast', { message: result.toastMessage || result.message, kind: 'info' })
  return ok(result.message, {
    total:      result.total,
    navigateTo: result.navigateTo,
    products:   (result.products || []).slice(0, 6).map(p => ({
      name: p.name, brand: p.brand, price: p.price,
      slug: p.slug, material: p.material, gender: p.gender,
    })),
  })
}

async function handleSuggestProducts(args = {}, socketId, dbId) {
  const suggestionArgs = typeof args === 'string'
    ? { query: `suggest ${args}`, isSuggestion: true }
    : { ...args, isSuggestion: true }
  return handleSearchProduct(suggestionArgs, socketId, dbId)
}

async function handleAddToCart({ product_id, product_slug, product_name, size, color, quantity = 1 }, socketId, dbId) {
  if (!dbId) return fail('Please sign in to add items to your cart.')

  try {
    // 1. Resolve product — agent args first, then open product page
    let product = null
    const tracked = getPageState(socketId)

    if (product_slug) {
      product = await getPublicBySlug(product_slug)
    } else if (product_name) {
      const r = await voiceSearch.search({ query: product_name })
      if (r.type === 'exact') product = r.product
    } else if (product_id) {
      const r = await voiceSearch.search({ query: product_id })
      product = r.product || null
    } else if (tracked?.type === 'product' && tracked.slug) {
      product = await getPublicBySlug(tracked.slug)
    }

    if (!product) {
      return fail('I could not find that product. Please search for a shoe first, then say "add to cart".')
    }

    if (!product.inStock && !product.variants?.some(isVariantInStock)) {
      return fail(`Sorry, ${product.name} is currently out of stock.`)
    }

    // 2. Inherit size/color from page state when agent omits them.
    // After select_variant fires, the client sends page:update with the chosen
    // color/size. So add_to_cart {} can read them from here.
    if (tracked?.type === 'product' && tracked.slug === product.slug) {
      if (!size  && tracked.size)  size  = String(tracked.size)
      if (!color && tracked.color) color = tracked.color
    }

    // 3. Validate before findVariant so error messages are specific
    const availableSizes  = [...new Set(product.variants?.filter(isVariantInStock).map(v => String(v.size)))].sort((a, b) => Number(a) - Number(b))
    const availableColors = [...new Set(product.variants?.filter(isVariantInStock).map(v => v.color).filter(Boolean))]

    if (!size && availableSizes.length > 1) {
      return fail(
        `What size do you want for ${product.name}? Available sizes: ${availableSizes.join(', ')}.`,
        { availableSizes, availableColors }
      )
    }

    // FIX: use local findVariant that handles both inStock and available fields
    const variant = findVariantLocal(product, size, color)

    if (!variant) {
      let msg = `I couldn't find ${product.name}`
      if (size)  msg += ` in size ${size}`
      if (color) msg += ` in ${color}`
      msg += `.`
      if (availableSizes.length)  msg += ` Available sizes: ${availableSizes.join(', ')}.`
      if (availableColors.length) msg += ` Available colors: ${availableColors.join(', ')}.`
      return fail(msg, { availableSizes, availableColors })
    }

    // 4. DB write — uses dbId (BIGINT), variant.id is ULID (correct for variantModel.findByPublicId)
    await cartService.addItem(dbId, { variantId: variant.id, quantity: Math.min(quantity, 10) })

    emit(socketId, 'cart:refresh', {})
    emit(socketId, 'toast', {
      message: `Added ${product.name}${size ? ` size ${size}` : ''}${color ? ` in ${color}` : ''} to your cart.`,
      kind: 'success',
    })
    return ok(`Added ${product.name}${size ? ` size ${size}` : ''}${color ? ` in ${color}` : ''} to your cart!`)

  } catch (err) {
    logger.error({ err: err.message, socketId, dbId }, 'handleAddToCart error')
    const raw = err.message || ''
    // Sanitize DB/SQL errors — never speak them to the user
    if (/truncated|column|row \d|sql|duplicate entry|constraint|foreign key/i.test(raw)) {
      logger.error({ raw, socketId, dbId }, '[handleAddToCart] raw DB error suppressed')
      return fail('Something went wrong adding to your cart. Please try again.')
    }
    // Domain errors (sold out, stock) are safe to surface
    return fail(raw || 'Failed to add item to cart. Please try again.')
  }
}

async function handleRemoveFromCart({ product_name, variant_id, product_slug }, socketId, dbId) {
  if (!dbId) return fail('Please sign in first.')

  try {
    if (!variant_id && (product_name || product_slug)) {
      const items = await cartService.get(dbId)
      const needle = (product_name || product_slug || '').toLowerCase()
      const match = items.find(i =>
        i.name?.toLowerCase().includes(needle) || i.slug?.toLowerCase() === needle
      )
      if (!match) {
        return fail(`I don't see ${product_name || product_slug} in your cart. Say "show my cart" to check what's in there.`)
      }
      variant_id = match.variantId || match.variant_id || match.id
    }

    if (!variant_id) {
      return fail('Please tell me which item to remove, or say "show my cart" first.')
    }

    await cartService.removeItem(dbId, variant_id)
    emit(socketId, 'cart:refresh', {})
    emit(socketId, 'toast', { message: 'Item removed from cart.', kind: 'info' })
    return ok('Done, item removed from your cart.')
  } catch (err) {
    logger.error({ err: err.message }, 'handleRemoveFromCart error')
    return fail('Failed to remove item. Please try again.')
  }
}

async function handleClearCart(_, socketId, dbId) {
  if (!dbId) return fail('Please sign in first.')
  try {
    await cartService.clear(dbId)
    emit(socketId, 'cart:refresh', {})
    emit(socketId, 'toast', { message: 'Cart cleared.', kind: 'info' })
    return ok('Your cart has been cleared.')
  } catch {
    return fail('Failed to clear cart.')
  }
}

// FIX #4: handleGetCart — full cart details for the `get_cart` tool which was
// missing entirely. The Retell agent config defines get_cart but had no handler.
async function handleGetCart(_, socketId, dbId) {
  if (!dbId) return fail('Please sign in to view your cart.')
  try {
    const items = await cartService.get(dbId)
    if (!items.length) return ok('Your cart is empty.', { items: [] })
    const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0)
    return ok(
      `You have ${items.length} item${items.length > 1 ? 's' : ''} in your cart. Total: $${total.toFixed(2)}.`,
      {
        items: items.map(i => ({
          name:      i.name,
          brand:     i.brand,
          size:      i.size,
          color:     i.color,
          quantity:  i.quantity,
          price:     i.price,
          variantId: i.variantId || i.id,
          slug:      i.slug,
        })),
        total: total.toFixed(2),
        count: items.length,
      }
    )
  } catch {
    return fail('Could not retrieve your cart.')
  }
}

async function handleGetCartSummary(_, socketId, dbId) {
  if (!dbId) return fail('Please sign in to view your cart.')
  try {
    const items = await cartService.get(dbId)
    if (!items.length) return ok('Your cart is empty.')
    const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0)
    const summary = items.map(i => `${i.name} x${i.quantity}`).join(', ')
    return ok(`You have ${items.length} item${items.length > 1 ? 's' : ''} in your cart: ${summary}. Total: $${total.toFixed(2)}.`)
  } catch {
    return fail('Could not retrieve your cart.')
  }
}

// FIX #5: handleUpdateCartQuantity — was missing entirely despite being in the
// Retell agent tool config. Handles increase/decrease/set by product_name or variant_id.
async function handleUpdateCartQuantity({ variant_id, product_name, product_slug, quantity, delta, action }, socketId, dbId) {
  if (!dbId) return fail('Please sign in first.')

  try {
    const items = await cartService.get(dbId)
    if (!items.length) return fail('Your cart is empty.')

    let item = null
    if (variant_id) {
      item = items.find(i => (i.variantId || i.id) === variant_id)
    } else if (product_name || product_slug) {
      const needle = (product_name || product_slug || '').toLowerCase()
      item = items.find(i => i.name?.toLowerCase().includes(needle) || i.slug?.toLowerCase() === needle)
    }

    if (!item) {
      const cartSummary = items.map(i => i.name).join(', ')
      return fail(`I couldn't find that item in your cart. You have: ${cartSummary}.`)
    }

    const currentQty = item.quantity || 1
    let newQty

    if (quantity !== undefined && quantity !== null) {
      newQty = Math.max(1, Math.min(10, Number(quantity)))
    } else if (delta !== undefined && delta !== null) {
      newQty = Math.max(1, Math.min(10, currentQty + Number(delta)))
    } else if (action === 'increase') {
      newQty = Math.min(10, currentQty + 1)
    } else if (action === 'decrease') {
      newQty = Math.max(1, currentQty - 1)
    } else {
      return fail('Please tell me the new quantity or say increase/decrease.')
    }

    const resolvedVariantId = item.variantId || item.id
    await cartService.setItem(dbId, { variantId: resolvedVariantId, quantity: newQty })
    emit(socketId, 'cart:refresh', {})
    emit(socketId, 'toast', { message: `Updated ${item.name} quantity to ${newQty}.`, kind: 'info' })
    return ok(`Updated ${item.name} quantity to ${newQty}.`, { newQuantity: newQty })
  } catch (err) {
    logger.error({ err: err.message }, 'handleUpdateCartQuantity error')
    return fail('Failed to update quantity. Please try again.')
  }
}

// FIX #6: handleToggleFavourite — removed `required: ["product_slug"]` constraint
// at the tool schema level (see agent JSON fix), and handle no-slug case here.
async function handleToggleFavourite({ product_slug, product_name, action }, socketId, dbId) {
  if (!dbId) return fail('Please sign in to save favourites.')

  try {
    let product = null
    if (product_slug) {
      product = await getPublicBySlug(product_slug)
    } else if (product_name) {
      const r = await voiceSearch.search({ query: product_name })
      if (r.type === 'exact') product = r.product
    } else {
      const tracked = getPageState(socketId)
      if (tracked?.type === 'product' && tracked.slug) {
        product = await getPublicBySlug(tracked.slug)
      }
    }

    if (!product) return fail('Could not find that product. Which shoe do you want to save?')

    const favourites = await favouriteService.get(dbId)
    const isSaved = favourites.some(f => f.id === product.id || f.slug === product.slug)

    if (action === 'add' || (!action && !isSaved)) {
      await favouriteService.add(dbId, product.id)
      emit(socketId, 'wishlist:refresh', {})
      emit(socketId, 'toast', { message: `${product.name} saved to favourites.`, kind: 'success' })
      return ok(`${product.name} has been saved to your favourites.`)
    } else {
      await favouriteService.remove(dbId, product.id)
      emit(socketId, 'wishlist:refresh', {})
      emit(socketId, 'toast', { message: `${product.name} removed from favourites.`, kind: 'info' })
      return ok(`${product.name} has been removed from your favourites.`)
    }
  } catch (err) {
    logger.error({ err: err.message }, 'handleToggleFavourite error')
    return fail('Failed to update favourites.')
  }
}

async function handleSelectVariant({ product_slug, product_id, product_name, color, size }, socketId) {
  try {
    const tracked = getPageState(socketId)

    let product = null
    let source = 'agent'
    if (product_slug) {
      product = await getPublicBySlug(product_slug)
    } else if (product_name) {
      const r = await voiceSearch.search({ query: product_name })
      product = r.type === 'exact' ? r.product : null
    } else if (product_id) {
      const r = await voiceSearch.search({ query: product_id })
      product = r.product || null
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
        : "I cannot see a product page on the customer's screen right now"
      return fail(
        `${where}. To select a color or size, open a product first, or use filter_products to narrow the catalog.`,
        { page: pageInfo }
      )
    }

    const availableColors = [...new Set(product.variants?.filter(isVariantInStock).map(v => v.color).filter(Boolean))]
    const availableSizes  = [...new Set(product.variants?.filter(isVariantInStock).map(v => String(v.size)).filter(Boolean))]
      .sort((a, b) => Number(a) - Number(b))

    const wantsColor = color != null && String(color).trim() !== ''
    const wantsSize  = size  != null && String(size).trim()  !== ''

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
        return fail(`${product.name} does not come in that color. Available colors: ${availableColors.join(', ') || 'none right now'}.`, { availableColors, availableSizes, page: pageInfo })
      }
      if (!availableColors.some(c => c.toLowerCase() === canonicalColor.toLowerCase())) {
        return fail(`${canonicalColor} is currently out of stock for ${product.name}. Available colors: ${availableColors.join(', ') || 'none right now'}.`, { availableColors, availableSizes, page: pageInfo })
      }
    }

    let canonicalSize = null
    if (wantsSize) {
      canonicalSize = normalizeSize(product, size)
      if (!canonicalSize) {
        return fail(`${product.name} does not come in size ${String(size).trim()}. Available sizes: ${availableSizes.join(', ') || 'none right now'}.`, { availableColors, availableSizes, page: pageInfo })
      }

      const effectiveColor = canonicalColor || trackedColor
      if (effectiveColor) {
        const variant = product.variants.find(v =>
          String(v.color).toLowerCase() === effectiveColor.toLowerCase() && String(v.size) === canonicalSize
        )
        if (!variant || !isVariantInStock(variant)) {
          const sizesForColor = [...new Set(product.variants
            .filter(v => String(v.color).toLowerCase() === effectiveColor.toLowerCase() && isVariantInStock(v))
            .map(v => String(v.size)))].sort((a, b) => Number(a) - Number(b))
          return fail(`Size ${canonicalSize} is not available in ${effectiveColor}. Available sizes in ${effectiveColor}: ${sizesForColor.join(', ') || 'none right now'}.`, { availableColors, availableSizes, page: pageInfo })
        }
      } else {
        if (!product.variants.some(v => String(v.size) === canonicalSize && isVariantInStock(v))) {
          return fail(`Size ${canonicalSize} is currently out of stock. Available sizes: ${availableSizes.join(', ') || 'none right now'}.`, { availableColors, availableSizes, page: pageInfo })
        }
      }
    }

    const payload = { slug: product.slug }
    if (canonicalColor) payload.color = canonicalColor
    if (canonicalSize)  payload.size  = canonicalSize
    emit(socketId, 'variant:select', payload)

    const chosenParts = [canonicalColor, canonicalSize && `size ${canonicalSize}`].filter(Boolean)
    return ok(`Selected ${product.name}${chosenParts.length ? ` in ${chosenParts.join(', ')}` : ''}.`, {
      product: { slug: product.slug, name: product.name },
      color: canonicalColor || null,
      size:  canonicalSize  || null,
      source,
    })
  } catch (err) {
    logger.error({ err: err.message, socketId }, 'handleSelectVariant error')
    return fail('Could not select that color and size. Please try again.')
  }
}

async function handleGetCurrentPage(_, socketId) {
  const tracked = getPageState(socketId)
  if (!tracked || tracked.type === 'unknown') {
    return ok('I do not have a live reading of which page the customer is viewing right now.', { page: null })
  }

  let description
  if (tracked.type === 'product') {
    let name = tracked.slug
    try {
      const product = await getPublicBySlug(tracked.slug)
      if (product) name = product.name
    } catch { /* keep slug */ }
    const selection = [tracked.color, tracked.size && `size ${tracked.size}`].filter(Boolean).join(', ')
    description = `the product page for ${name}${selection ? ` with ${selection} selected` : ''}`
  } else if (tracked.type === 'catalog') {
    description = 'the product catalog page'
  } else {
    description = `the ${tracked.path || tracked.type} page`
  }

  return ok(`The customer is on ${description}.`, {
    page: {
      type:  tracked.type,
      path:  tracked.path,
      slug:  tracked.slug,
      color: tracked.color || null,
      size:  tracked.size  || null,
    },
  })
}

async function handleNavigateTo({ page }, socketId) {
  const PAGES = {
    home: '/', products: '/products', cart: '/cart',
    profile: '/profile', orders: '/orders', favourites: '/profile',
    wishlist: '/profile', checkout: '/checkout/payment', about: '/about',
    contact: '/contact', blogs: '/blogs', login: '/login', signup: '/signup',
  }
  const path = PAGES[page?.toLowerCase()]
  if (!path) return fail(`I don't know how to navigate to "${page}". Try: home, products, cart, profile, or orders.`)
  emit(socketId, 'navigate', { path })
  return ok(`Navigating to ${page}.`)
}

async function handleFilterProducts(args = {}, socketId) {
  const selectionArgs = selectionRedirectArgs(args, socketId)
  if (selectionArgs) return handleSelectVariant(selectionArgs, socketId)

  let { color, size, gender, min_price, max_price, price_min, price_max, sort, category, brand, material, query, q } = args
  const rawText = [query, q, brand, category, material].filter(Boolean).join(' ')

  if (!brand)    brand    = voiceSearch.extractBrand(rawText)
  if (!category) { const ec = voiceSearch.extractCategory(rawText); if (ec) category = ec.slug }
  if (!gender)   gender   = voiceSearch.extractGender(rawText)
  if (!color)    color    = voiceSearch.extractColor(rawText)
  if (!material) material = voiceSearch.extractMaterial(rawText)

  const actualMinPrice = min_price ?? price_min
  const actualMaxPrice = max_price ?? price_max

  const params = new URLSearchParams()
  if (category)     params.set('category', category)
  if (gender)       params.set('gender', gender)
  if (color)        params.set('color', color)
  if (size)         params.set('size', String(size))
  if (actualMinPrice != null) params.set('priceMin', String(actualMinPrice))
  if (actualMaxPrice != null) params.set('priceMax', String(actualMaxPrice))

  if (brand) {
    params.set('q', brand)
  } else if (query?.trim()) {
    const cleanQ = query.toLowerCase()
      .replace(/\b(running|sneakers|casual|formal|boots|basketball|outdoor|training|shoes|shoe|for|in|men|women|unisex|kids)\b/gi, '')
      .replace(/\s+/g, ' ').trim()
    if (cleanQ) params.set('q', cleanQ)
  }

  const SORT_MAP = { price_asc: 'price_asc', price_desc: 'price_desc', lowest: 'price_asc', highest: 'price_desc', newest: 'newest', popular: 'popular', rating: 'rating' }
  if (sort) params.set('sort', SORT_MAP[sort] || sort)

  const path = `/products?${params.toString()}`
  emit(socketId, 'navigate', { path })
  emit(socketId, 'toast', { message: 'Filters applied. Showing matching products.', kind: 'info' })

  const descParts = [
    brand        && `Brand: ${brand}`,
    category     && `Category: ${category}`,
    gender       && `Gender: ${gender}`,
    color        && `Color: ${color}`,
    size         && `Size: ${size}`,
    material     && `Material: ${material}`,
    actualMinPrice != null && `Min price: $${actualMinPrice}`,
    actualMaxPrice != null && `Max price: $${actualMaxPrice}`,
    sort         && `Sort: ${sort}`,
  ].filter(Boolean)

  return ok(`Filters applied: ${descParts.join(', ') || 'all shoes'}. Showing results on your screen.`)
}

async function handleClearFilters(_, socketId) {
  emit(socketId, 'navigate', { path: '/products' })
  emit(socketId, 'toast', { message: 'Filters cleared. Showing all products.', kind: 'info' })
  return ok('Filters cleared. Showing all products on screen.')
}

async function handleOpenCart(_, socketId) {
  emit(socketId, 'navigate', { path: '/cart' })
  return ok('Opening your cart.')
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

const FUNCTION_MAP = {
  // Search & Recommendations
  search_product:       handleSearchProduct,
  suggest_product:      handleSuggestProducts,

  // Cart
  add_to_cart:          handleAddToCart,
  remove_from_cart:     handleRemoveFromCart,
  clear_cart:           handleClearCart,
  get_cart:             handleGetCart,
  get_cart_summary:     handleGetCartSummary,
  update_cart_quantity: handleUpdateCartQuantity,
  open_cart:            handleOpenCart,

  // Products & Variants
  filter_products:      handleFilterProducts,
  clear_filters:        handleClearFilters,
  select_variant:       handleSelectVariant,
  toggle_favourite:     handleToggleFavourite,

  // Navigation & Page State
  navigate_to:          handleNavigateTo,
  get_current_page:     handleGetCurrentPage,
}

// FIX: dispatch resolves dbId ONCE here and passes it to every handler.
// Previously each handler called resolveDbUserId independently = N DB queries per call.
export async function dispatch(functionName, args, socketId) {

  const rawName = String(functionName || '').trim()
  const normalizedName = rawName
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .toLowerCase();

  const handler = FUNCTION_MAP[normalizedName] || FUNCTION_MAP[rawName];

  if (!handler) {
    logger.warn({ functionName, socketId }, 'unknown retell function called')
    return fail(`I don't know how to handle "${functionName}" yet.`)
  }

  // Resolve ULID → internalId once per dispatch, share with all handlers
  const dbId = await resolveDbUserId(socketId)

  logger.info({ functionName, args, socketId, dbId }, '[RetellFunction] dispatching')

  try {
    const result = await Promise.race([
      handler(args || {}, socketId, dbId),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Function timeout after 5 seconds')), 5000)
      ),
    ])
    return result
  } catch (err) {
    logger.error({ err: err.message, functionName, socketId }, '[RetellFunction] handler error')
    return fail('Something went wrong. Please try again.')
  }
}