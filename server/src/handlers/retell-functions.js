import * as cartService      from '../services/cart.service.js'
import * as favouriteService from '../services/favourite.service.js'
import * as voiceSearch      from '../services/voice-search.service.js'
import { getPublicBySlug }   from '../services/product.service.js'
import { emitToUser }        from '../config/socket.js'
import { logger }            from '../config/logger.js'

// ─── Helpers ────────────────────────────────────────────────────────────────

function emit(userId, type, payload = {}) {
  try {
    emitToUser(userId, 'ui:command', { type, payload, timestamp: Date.now() })
  } catch (err) {
    logger.warn({ err: err.message, userId, type }, 'socket emit failed')
  }
}

function ok(message, data = {}) {
  return { success: true, message, ...data }
}

function fail(message) {
  return { success: false, message }
}

// ─── Function Handlers ───────────────────────────────────────────────────────

async function handleSearchProduct({ query, size, color, gender, min_price, max_price, sort }, userId) {
  if (!query?.trim()) return fail('Please tell me what kind of shoes you are looking for.')

  // Build enriched query with any extracted structured params
  let enrichedQuery = query
  if (gender) enrichedQuery += ` ${gender}`

  const result = await voiceSearch.search(enrichedQuery)

  if (result.type === 'not_found') {
    emit(userId, 'toast', { message: result.message, kind: 'info' })
    return fail(result.message)
  }

  if (result.type === 'error') {
    return fail(result.message)
  }

  if (result.type === 'exact') {
    // Navigate directly to product detail page
    emit(userId, 'navigate', { path: `/product/${result.product.slug}` })
    emit(userId, 'toast', { message: `Opening ${result.product.name}`, kind: 'info' })
    return ok(result.message, {
      product: {
        id:    result.product.id,
        name:  result.product.name,
        brand: result.product.brand,
        price: result.product.price,
        slug:  result.product.slug,
        inStock: result.product.inStock,
        sizes:   result.product.sizes || [],
        colors:  result.product.colors || [],
      },
    })
  }

  // Multiple results — navigate to product listing with filters
  emit(userId, 'navigate', { path: result.navigateTo })
  emit(userId, 'toast', { message: result.message, kind: 'info' })
  return ok(result.message, {
    total:    result.total,
    products: result.products.slice(0, 5).map(p => ({
      name: p.name, brand: p.brand, price: p.price, slug: p.slug,
    })),
  })
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
      // Search by id fallback
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

async function handleFilterProducts({ color, size, gender, min_price, max_price, sort, category }, userId) {
  const params = new URLSearchParams()
  if (color)     params.set('color', color)
  if (size)      params.set('size', String(size))
  if (gender)    params.set('gender', gender)
  if (min_price) params.set('priceMin', String(min_price))
  if (max_price) params.set('priceMax', String(max_price))
  if (category)  params.set('category', category)

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
  emit(userId, 'toast', { message: 'Filters applied.', kind: 'info' })

  const description = [
    color    && `Color: ${color}`,
    size     && `Size: ${size}`,
    gender   && `Gender: ${gender}`,
    min_price && `Min price: $${min_price}`,
    max_price && `Max price: $${max_price}`,
    sort     && `Sort: ${sort}`,
    category && `Category: ${category}`,
  ].filter(Boolean).join(', ')

  return ok(`Filters applied — ${description}. Showing results on screen.`)
}

async function handleClearFilters(_, userId) {
  emit(userId, 'navigate', { path: '/products' })
  return ok('Filters cleared. Showing all products.')
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
  search_product:      handleSearchProduct,
  add_to_cart:         handleAddToCart,
  remove_from_cart:    handleRemoveFromCart,
  clear_cart:          handleClearCart,
  toggle_favourite:    handleToggleFavourite,
  navigate_to:         handleNavigateTo,
  filter_products:     handleFilterProducts,
  clear_filters:       handleClearFilters,
  open_cart:           handleOpenCart,
  get_cart_summary:    handleGetCartSummary,
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
