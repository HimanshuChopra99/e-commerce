import * as cartService from '../services/cart.service.js'
import * as favouriteService from '../services/favourite.service.js'
import * as voiceSearch from '../services/voice-search.service.js'
import { getPublicBySlug } from '../services/product.service.js'
import { getPageState } from '../services/session-state.service.js'
import { emitToUser } from '../config/socket.js'
import { logger } from '../config/logger.js'

// ─── Helpers ────────────────────────────────────────────────────────────────

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
//
// These normalise free-form voice values ("red", "grey", "10", "ten") into the
// canonical strings stored on the product's variants ("Red", "10"). Validation
// happens HERE, server-side, so the UI never renders an invalid selection.

function normalizeColor(product, rawColor) {
  if (!product?.variants?.length || rawColor === undefined || rawColor === null || rawColor === '') return null
  const target = String(rawColor).trim().toLowerCase()
  const colors = [...new Set(product.variants.map((v) => v.color).filter(Boolean))]

  // Exact match wins
  const exact = colors.find((c) => c.toLowerCase() === target)
  if (exact) return exact

  // Common spelling variants (grey/gray, etc.)
  const synonyms = { gray: 'grey', grey: 'gray', 'off-white': 'white', cream: 'beige' }
  const swapped = synonyms[target]
  if (swapped) {
    const match = colors.find((c) => c.toLowerCase() === swapped)
    if (match) return match
  }

  // Partial match — "navy" matches "Shadow Navy", "red" matches "Dark Red"
  const partial = colors.find((c) => c.toLowerCase().includes(target) || target.includes(c.toLowerCase()))
  return partial || null
}

function normalizeSize(product, rawSize) {
  if (!product?.variants?.length || rawSize === undefined || rawSize === null || rawSize === '') return null
  const target = String(rawSize).trim()
  const sizes = [...new Set(product.variants.map((v) => String(v.size)).filter(Boolean))]

  // Exact match wins ("10", "10.5")
  const exact = sizes.find((s) => s === target)
  if (exact) return exact

  // Numeric match tolerates formatting ("10.0" → "10")
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

// If the customer is on a product detail page and an incoming search/filter
// request is really a color/size selection ("select red", "grey size 42",
// "pick the blue one"), return the selection args to apply to the OPEN
// product instead of navigating to the catalog. This makes the feature work
// even when the LLM agent chooses the search/filter tools, because the
// server knows which page the customer is on.
function selectionRedirectArgs(args, userId) {
  const tracked = getPageState(userId)
  if (tracked?.type !== 'product' || !tracked.slug) return null
  if (args.product_name || args.product_id) return null

  const text = String(args.query || args.q || '').toLowerCase()
  const extractedColor = args.color || voiceSearch.extractColor(text)
  const extractedSize = args.size || voiceSearch.extractSize(text)
  if (!extractedColor && !extractedSize) return null

  // Other browse signals (category, brand, material, gender, price) mean the
  // customer wants the catalog, not a selection on the open product.
  const hasOtherFilter = Boolean(args.category || args.brand || args.material || args.gender) ||
    Boolean(voiceSearch.extractCategory(text) || voiceSearch.extractBrand(text) || voiceSearch.extractMaterial(text) || voiceSearch.extractGender(text))
  const hasPrice = [args.min_price, args.max_price, args.price_min, args.price_max]
    .some((v) => v !== undefined && v !== null)
  if (hasOtherFilter || hasPrice) return null

  // Selection verbs win even if the phrase also contains "shoes".
  const selectionVerb = /\b(select|pick|choose|switch|change|make it|go with|i want|i'll take|put me in|swap|try|grab)\b/i.test(text)
  // Explicit browse intent means a real search ("show me red shoes").
  const browseWord = /\b(show|find|browse|search|looking|list|suggest|recommend|any|some|best|cheap|under|over|need)\b/i.test(text)

  if (selectionVerb || !browseWord) {
    return { color: extractedColor, size: extractedSize }
  }
  return null
}

// ─── Function Handlers ───────────────────────────────────────────────────────

async function handleSearchProduct(args = {}, userId) {
  logger.info({ args, userId }, '[RetellHandler] handleSearchProduct invoked')

  // If the customer is already on a product detail page and the request is
  // really a color/size selection, apply it there instead of searching.
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
    // Specific product match >= 80% or exact comprehensive details >= 90%
    emit(userId, 'navigate', { path: `/product/${result.product.slug}` })
    emit(userId, 'toast', { message: `Opening ${result.product.name}`, kind: 'info' })
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

  // Suggestions, browsing, and multi-result searches — navigate to filtered product list on screen
  emit(userId, 'navigate', { path: result.navigateTo })
  emit(userId, 'toast', { message: result.toastMessage || result.message, kind: 'info' })

  return ok(result.message, {
    total:      result.total,
    navigateTo: result.navigateTo,
    products:   (result.products || []).slice(0, 6).map(p => ({
      name:     p.name,
      brand:    p.brand,
      price:    p.price,
      slug:     p.slug,
      material: p.material,
      gender:   p.gender,
    })),
  })
}
  
async function handleSuggestProducts(args = {}, userId) {
  // Explicit suggestion intent handler
  const suggestionArgs = typeof args === 'string'
    ? { query: `suggest ${args}`, isSuggestion: true }
    : { ...args, isSuggestion: true }
  return handleSearchProduct(suggestionArgs, userId)
}

async function handleAddToCart({ product_id, product_slug, size, color, quantity = 1 }, userId) {
  if (!userId || userId === 'guest') {
    return fail('Please sign in to add items to your cart.')
  }

  try {
    let product
    if (product_slug) {
      product = await getPublicBySlug(product_slug)
    } else if (product_id) {
      const result = await voiceSearch.search(product_id)
      product = result.product || null
    }

    if (!product) return fail('I could not find that product. Please try searching for it first.')

    if (!product.inStock) {
      return fail(`Sorry, ${product.name} is currently out of stock.`)
    }

    // Find the right variant
    const variant = voiceSearch.findVariant(product, size, color)

    if (!variant) {
      const availableSizes = [...new Set(product.variants?.filter(v => v.inStock).map(v => v.size))].join(', ')
      const availableColors = [...new Set(product.variants?.filter(v => v.inStock).map(v => v.color))].join(', ')
      let msg = `I couldn't find ${product.name}`
      if (size) msg += ` in size ${size}`
      if (color) msg += ` in ${color}`
      msg += `. Available sizes: ${availableSizes}. Available colors: ${availableColors}.`
      return fail(msg)
    }

    await cartService.addItem(userId, { variantId: variant.id, quantity: Math.min(quantity, 10) })

    emit(userId, 'cart:refresh', {})
    emit(userId, 'toast', {
      message: `Added ${product.name}${size ? ` size ${size}` : ''}${color ? ` in ${color}` : ''} to your cart.`,
      kind: 'success',
    })

    return ok(`Added ${product.name} to your cart successfully.`)
  } catch (err) {
    logger.error({ err: err.message, userId }, 'handleAddToCart error')
    return fail(err.message || 'Failed to add item to cart. Please try again.')
  }
}

async function handleRemoveFromCart({ product_name, variant_id }, userId) {
  if (!userId || userId === 'guest') return fail('Please sign in first.')

  try {
    if (variant_id) {
      await cartService.removeItem(userId, variant_id)
      emit(userId, 'cart:refresh', {})
      emit(userId, 'toast', { message: 'Item removed from cart.', kind: 'info' })
      return ok('Item removed from your cart.')
    }
    return fail('Please specify which item to remove.')
  } catch (err) {
    logger.error({ err: err.message }, 'handleRemoveFromCart error')
    return fail('Failed to remove item. Please try again.')
  }
}

async function handleClearCart(_, userId) {
  if (!userId || userId === 'guest') return fail('Please sign in first.')
  try {
    await cartService.clear(userId)
    emit(userId, 'cart:refresh', {})
    emit(userId, 'toast', { message: 'Cart cleared.', kind: 'info' })
    return ok('Your cart has been cleared.')
  } catch (err) {
    return fail('Failed to clear cart.')
  }
}

async function handleToggleFavourite({ product_slug, action }, userId) {
  if (!userId || userId === 'guest') return fail('Please sign in to save favourites.')

  try {
    let product
    if (product_slug) {
      product = await getPublicBySlug(product_slug)
    }
    if (!product) return fail('Could not find that product.')

    const favourites = await favouriteService.get(userId)
    const isSaved = favourites.some(f => f.id === product.id || f.slug === product.slug)

    if (action === 'add' || (!action && !isSaved)) {
      await favouriteService.add(userId, product.id)
      emit(userId, 'wishlist:refresh', {})
      emit(userId, 'toast', { message: `${product.name} saved to favourites.`, kind: 'success' })
      return ok(`${product.name} has been saved to your favourites.`)
    } else {
      await favouriteService.remove(userId, product.id)
      emit(userId, 'wishlist:refresh', {})
      emit(userId, 'toast', { message: `${product.name} removed from favourites.`, kind: 'info' })
      return ok(`${product.name} has been removed from your favourites.`)
    }
  } catch (err) {
    logger.error({ err: err.message }, 'handleToggleFavourite error')
    return fail('Failed to update favourites.')
  }
}

// ─── Retell agent tool schema (paste into your Retell agent's tool list) ─────
// name: select_variant
// description: >
//   Selects a color and/or size on the product detail page the user is
//   currently viewing. Call this when the user says things like "select red
//   and size 10", "pick the blue one", "make it size 9", "I want the black
//   colour in a 10", "go with grey". You may pass ONLY the fields the user
//   mentioned (color, size, or both). product_slug is optional: if omitted,
//   the server uses the product page the user currently has open. If the tool
//   returns success:false, the requested color/size is NOT available — read
//   the available options from the message to the user.
// parameters:
//   type: object
//   properties:
//     product_slug:
//       type: string
//       description: Optional. Slug of the product currently displayed on the user's screen.
//     color:
//       type: string
//       description: The color the user asked for (e.g. "red", "navy", "grey").
//     size:
//       type: string
//       description: The size the user asked for (e.g. "10", "9.5").
//   required: []
// ─────────────────────────────────────────────────────────────────────────────

async function handleSelectVariant({ product_slug, product_id, product_name, color, size }, userId) {
  try {
    const tracked = getPageState(userId)

    // 1. Resolve the product: explicit agent args win, otherwise use the page
    //    the user actually has open (reported by the client via page:update),
    //    so manually-opened product pages work exactly like agent-opened ones.
    let product
    let source = 'agent'
    if (product_slug) {
      product = await getPublicBySlug(product_slug)
    } else if (product_name) {
      const result = await voiceSearch.search(product_name)
      product = result.type === 'exact' ? result.product : null
    } else if (product_id) {
      const result = await voiceSearch.search(product_id)
      product = result.product || null
    } else if (tracked?.type === 'product' && tracked.slug) {
      product = await getPublicBySlug(tracked.slug)
      source = 'tracked'
    }

    const pageInfo = tracked
      ? { type: tracked.type, path: tracked.path, slug: tracked.slug, color: tracked.color, size: tracked.size }
      : null

    if (!product) {
      // No product context — tell the agent where the user IS so it can
      // choose the right tool (open a product vs filter the catalog).
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

    // Nothing requested at all → tell the agent what this product offers
    if (!wantsColor && !wantsSize) {
      return ok(`${product.name} is on your screen. Available colors: ${availableColors.join(', ') || 'none'}. Available sizes: ${availableSizes.join(', ') || 'none'}.`, {
        product: { slug: product.slug, name: product.name },
        colors: availableColors,
        sizes: availableSizes,
        source,
      })
    }

    // The currently selected color (from the tracked page) is used as context
    // when the user only asks for a size.
    const trackedColor = tracked?.type === 'product' && tracked.slug === product.slug ? tracked.color : null

    // 2. Validate the requested color (exists + in stock anywhere on product)
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

    // 3. Validate the requested size (exists + in stock for the effective color)
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

    // 4. Validated — flip the selection on the user's screen through the socket.
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

// ─── Retell agent tool schema (paste into your Retell agent's tool list) ─────
// name: get_current_page
// description: >
//   Returns which page the customer is currently viewing (product detail page
//   with its slug, the catalog, cart, etc.) and the color/size currently
//   selected on a product page. Call this when a command could apply to
//   different pages and you are unsure where the customer is.
// parameters:
//   type: object
//   properties: {}
//   required: []
// ─────────────────────────────────────────────────────────────────────────────

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

async function handleFilterProducts(args = {}, userId) {
  // Same interception as search: a color/size-only filter while a product
  // detail page is open is a selection request, not a catalog filter.
  const selectionArgs = selectionRedirectArgs(args, userId)
  if (selectionArgs) {
    return handleSelectVariant(selectionArgs, userId)
  }

  let { color, size, gender, min_price, max_price, price_min, price_max, sort, category, brand, material, query, q } = args
  const rawText = [query, q, brand, category, material].filter(Boolean).join(' ')

  if (!brand) {
    brand = voiceSearch.extractBrand(rawText)
  }
  if (!category) {
    const extractedCat = voiceSearch.extractCategory(rawText)
    if (extractedCat) category = extractedCat.slug
  }
  if (!gender) {
    gender = voiceSearch.extractGender(rawText)
  }
  if (!color) {
    color = voiceSearch.extractColor(rawText)
  }
  if (!material) {
    material = voiceSearch.extractMaterial(rawText)
  }

  const actualMinPrice = min_price ?? price_min
  const actualMaxPrice = max_price ?? price_max

  const params = new URLSearchParams()
  if (category)  params.set('category', category)
  if (gender)    params.set('gender', gender)
  if (color)     params.set('color', color)
  if (size)      params.set('size', String(size))
  if (actualMinPrice !== undefined && actualMinPrice !== null) params.set('priceMin', String(actualMinPrice))
  if (actualMaxPrice !== undefined && actualMaxPrice !== null) params.set('priceMax', String(actualMaxPrice))
  if (brand) {
    params.set('q', brand)
  } else if (query && query.trim()) {
    const cleanQ = query.toLowerCase()
      .replace(/\b(running|sneakers|casual|formal|boots|basketball|outdoor|training|shoes|shoe|for|in|men|women|unisex|kids)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim()
    if (cleanQ) {
      params.set('q', cleanQ)
    }
  }
  if (color) params.set('color', color)
  if (size) params.set('size', String(size))
  if (gender) params.set('gender', gender)
  if (min_price) params.set('priceMin', String(min_price))
  if (max_price) params.set('priceMax', String(max_price))
  if (category) params.set('category', category)
  
  const SORT_MAP = {
    'price_asc': 'price_asc',
    'price_desc': 'price_desc',
    'lowest': 'price_asc',
    'highest': 'price_desc',
    'newest': 'newest',
    'popular': 'popular',
    'rating': 'rating',
  }
  if (sort) params.set('sort', SORT_MAP[sort] || sort)

  const path = `/products?${params.toString()}`
  emit(userId, 'navigate', { path })
  emit(userId, 'toast', { message: 'Filters applied. Showing matching products.', kind: 'info' })

  const description = [
    brand    && `Brand: ${brand}`,
    category && `Category: ${category}`,
    gender   && `Gender: ${gender}`,
    color    && `Color: ${color}`,
    size     && `Size: ${size}`,
    material && `Material: ${material}`,
    actualMinPrice && `Min price: $${actualMinPrice}`,
    actualMaxPrice && `Max price: $${actualMaxPrice}`,
    sort     && `Sort: ${sort}`,
    color && `Color: ${color}`,
    size && `Size: ${size}`,
    gender && `Gender: ${gender}`,
    min_price && `Min price: $${min_price}`,
    max_price && `Max price: $${max_price}`,
    sort && `Sort: ${sort}`,
    category && `Category: ${category}`,
  ].filter(Boolean).join(', ')

  return ok(`Filters applied: ${description || 'all shoes'}. Showing results on your screen.`)
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
  try {
    const items = await cartService.get(userId)
    if (!items.length) return ok('Your cart is empty.')
    const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0)
    const summary = items.map(i => `${i.name} x${i.quantity}`).join(', ')
    return ok(`You have ${items.length} item${items.length > 1 ? 's' : ''} in your cart: ${summary}. Total: $${total.toFixed(2)}.`)
  } catch (err) {
    return fail('Could not retrieve your cart.')
  }
}

// ─── Main Dispatcher ─────────────────────────────────────────────────────────

const FUNCTION_MAP = {
  // Search & suggestions
  search_product:       handleSearchProduct,
  searchProduct:        handleSearchProduct,
  search_products:      handleSearchProduct,
  searchProducts:       handleSearchProduct,
  product_search:       handleSearchProduct,
  suggest_product:      handleSuggestProducts,
  suggestProduct:       handleSuggestProducts,
  suggest_products:     handleSuggestProducts,
  suggestProducts:      handleSuggestProducts,
  recommend_products:   handleSuggestProducts,
  recommendProducts:    handleSuggestProducts,
  get_suggestions:      handleSuggestProducts,

  // Filters & catalogue navigation
  filter_products:      handleFilterProducts,
  filterProducts:       handleFilterProducts,
  apply_filters:        handleFilterProducts,
  clear_filters:        handleClearFilters,
  clearFilters:         handleClearFilters,
  reset_filters:        handleClearFilters,

  // Cart operations
  add_to_cart:          handleAddToCart,
  addToCart:            handleAddToCart,
  remove_from_cart:     handleRemoveFromCart,
  removeFromCart:       handleRemoveFromCart,
  clear_cart:           handleClearCart,
  clearCart:            handleClearCart,
  open_cart:            handleOpenCart,
  openCart:             handleOpenCart,
  view_cart:            handleOpenCart,
  get_cart_summary:     handleGetCartSummary,
  getCartSummary:       handleGetCartSummary,

  // Favourites & general navigation
  toggle_favourite:     handleToggleFavourite,
  toggleFavourite:      handleToggleFavourite,
  add_to_wishlist:      handleToggleFavourite,
  toggleWishlist:       handleToggleFavourite,

  // Product variant selection (color/size) on the product detail page
  select_variant:       handleSelectVariant,
  selectVariant:        handleSelectVariant,
  select_color_size:    handleSelectVariant,
  selectColorSize:      handleSelectVariant,
  select_color:         handleSelectVariant,
  selectColor:          handleSelectVariant,
  select_size:          handleSelectVariant,
  selectSize:           handleSelectVariant,
  choose_variant:       handleSelectVariant,
  chooseVariant:        handleSelectVariant,
  pick_variant:         handleSelectVariant,
  pickVariant:          handleSelectVariant,
  customize_product:    handleSelectVariant,
  customizeProduct:     handleSelectVariant,

  // Current page awareness
  get_current_page:     handleGetCurrentPage,
  getCurrentPage:       handleGetCurrentPage,
  current_page:         handleGetCurrentPage,
  currentPage:          handleGetCurrentPage,
  where_is_user:        handleGetCurrentPage,
  whereIsUser:          handleGetCurrentPage,

  navigate_to:          handleNavigateTo,
  navigateTo:           handleNavigateTo,
  go_to_page:           handleNavigateTo,
  search_product: handleSearchProduct,
  add_to_cart: handleAddToCart,
  remove_from_cart: handleRemoveFromCart,
  clear_cart: handleClearCart,
  toggle_favourite: handleToggleFavourite,
  navigate_to: handleNavigateTo,
  filter_products: handleFilterProducts,
  clear_filters: handleClearFilters,
  open_cart: handleOpenCart,
  get_cart_summary: handleGetCartSummary,
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
