import * as cartService      from '../services/cart.service.js'
import * as favouriteService from '../services/favourite.service.js'
import * as voiceSearch      from '../services/voice-search.service.js'
import { getPublicBySlug }   from '../services/product.service.js'
import { emitToUser }        from '../config/socket.js'
import { logger }            from '../config/logger.js'

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

function fail(message) {
  return { success: false, message }
}

// ─── Function Handlers ───────────────────────────────────────────────────────

async function handleSearchProduct(args = {}, userId) {
  logger.info({ args, userId }, '[RetellHandler] handleSearchProduct invoked')

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
        id:      result.product.id,
        name:    result.product.name,
        brand:   result.product.brand,
        price:   result.product.price,
        slug:    result.product.slug,
        material:result.product.material,
        gender:  result.product.gender,
        inStock: result.product.inStock,
        sizes:   result.product.sizes || [],
        colors:  result.product.colors || [],
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
      const availableSizes  = [...new Set(product.variants?.filter(v => v.inStock).map(v => v.size))].join(', ')
      const availableColors = [...new Set(product.variants?.filter(v => v.inStock).map(v => v.color))].join(', ')
      let msg = `I couldn't find ${product.name}`
      if (size)  msg += ` in size ${size}`
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
    const isSaved    = favourites.some(f => f.id === product.id || f.slug === product.slug)

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

async function handleNavigateTo({ page }, userId) {
  const PAGES = {
    home:       '/',
    products:   '/products',
    cart:       '/cart',
    profile:    '/profile',
    orders:     '/orders',
    favourites: '/profile',
    wishlist:   '/profile',
    checkout:   '/checkout/payment',
    login:      '/login',
    signup:     '/signup',
  }

  const path = PAGES[page?.toLowerCase()]
  if (!path) return fail(`I don't know how to navigate to "${page}". Try: home, products, cart, profile, or orders.`)

  emit(userId, 'navigate', { path })
  return ok(`Navigating to ${page}.`)
}

async function handleFilterProducts(args = {}, userId) {
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

  const SORT_MAP = {
    'price_asc':   'price_asc',
    'price_desc':  'price_desc',
    'lowest':      'price_asc',
    'highest':     'price_desc',
    'newest':      'newest',
    'popular':     'popular',
    'rating':      'rating',
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
  navigate_to:          handleNavigateTo,
  navigateTo:           handleNavigateTo,
  go_to_page:           handleNavigateTo,
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
