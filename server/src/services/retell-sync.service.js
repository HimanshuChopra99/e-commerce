import retellClient from '../config/retell.js'
import { logger } from '../config/logger.js'

const debounceTimers = new Map() // callId -> timeoutId
const DEBOUNCE_MS = 400

/**
 * Syncs updated browser session state to Retell AI active call.
 * Uses a 400ms debounce buffer so rapid user clicks (e.g. clicking + to increase cart quantity 5 times)
 * trigger only 1 clean update call with the final snapshot once the user pauses.
 */
export async function syncRetellState(state, immediate = false) {
  if (!state || !state.callId) return

  const callId = String(state.callId)

  // Clear pending timer for this call if user is actively clicking/interacting
  if (debounceTimers.has(callId)) {
    clearTimeout(debounceTimers.get(callId))
    debounceTimers.delete(callId)
  }

  if (immediate) {
    await executeRetellSync(state)
  } else {
    const timerId = setTimeout(async () => {
      debounceTimers.delete(callId)
      await executeRetellSync(state)
    }, DEBOUNCE_MS)

    debounceTimers.set(callId, timerId)
  }
}

async function executeRetellSync(state) {
  try {
    const dynamicVariables = {
      current_page: formatPageContext(state),
      active_filters: formatFiltersContext(state.filters),
      viewed_product: formatProductContext(state.productDetails, state.color, state.size),
      cart_summary: formatCartContext(state.cartSummary),
      last_user_action: state.lastAction || 'User interacted with browser',
    }

    const actionText = state.lastAction || ''
    const shouldTriggerResponse = actionText.includes('[CRITICAL DIRECTIVE]')

    logger.info({ callId: state.callId, dynamicVariables, shouldTriggerResponse }, '[RetellSync] Updating dynamic variables for active call via updateLive')

    if (typeof retellClient?.call?.updateLive === 'function') {
      const callControl = {}
      if (shouldTriggerResponse) {
        callControl.trigger_response = true
      }

      const payload = {
        fields_to_override: {
          override_dynamic_variables: dynamicVariables,
        },
      }
      if (Object.keys(callControl).length > 0) {
        payload.call_control = callControl
      }

      await retellClient.call.updateLive(state.callId, payload)
    } else {
      await retellClient.call.update(state.callId, {
        retell_llm_dynamic_variables: dynamicVariables,
      })
    }
  } catch (err) {
    // Non-blocking catch: Retell update failures (e.g. call already ended) should not break socket thread
    logger.warn({ err: err.message, callId: state.callId }, '[RetellSync] Failed to update call dynamic variables')
  }
}

function formatPageContext(state) {
  if (!state || !state.path) return 'Home page'
  const p = String(state.path).toLowerCase().split('?')[0]
  if (p === '/' || p === '') return 'Home page'
  if (p === '/cart') return 'Shopping Cart page'
  if (p === '/checkout/payment' || p.startsWith('/checkout')) return 'Checkout page'
  if (p === '/products' || state.type === 'catalog') return 'Product Catalog page'
  if (p === '/profile' || p === '/favourites' || p === '/wishlist') return 'Customer Profile page'
  if (p === '/orders') return 'Order History page'
  if (p.startsWith('/orders/')) return 'Order Details page'
  if (state.type === 'product' && state.productDetails) {
    return `Product page for "${state.productDetails.name || state.slug}"`
  }
  if (p.startsWith('/product/')) return 'Product Details page'
  if (p === '/about') return 'About Us page'
  if (p === '/contact') return 'Contact page'
  if (p === '/blogs') return 'Blogs page'
  if (p === '/login') return 'Login page'
  if (p === '/signup') return 'Signup page'
  return `${state.type || p.replace(/[^a-z0-9]/gi, ' ')} page`.trim()
}

function formatFiltersContext(filters) {
  if (!filters || Object.keys(filters).length === 0) return 'No active filters'
  const parts = []
  if (filters.category) parts.push(`Category: ${filters.category}`)
  if (filters.gender) parts.push(`Gender: ${filters.gender}`)
  if (filters.color) parts.push(`Color: ${filters.color}`)
  if (filters.size) parts.push(`Size: ${filters.size}`)
  if (filters.minPrice || filters.maxPrice) parts.push(`Price: $${filters.minPrice || 0} - $${filters.maxPrice || 'Any'}`)
  if (filters.sort) parts.push(`Sorted by: ${filters.sort}`)
  return parts.length ? parts.join(' | ') : 'No active filters'
}

function formatProductContext(product, selectedColor, selectedSize) {
  if (!product) return 'No product currently open'
  const details = [`Name: ${product.name || 'Unknown'}`, `Price: $${product.price || 0}`]
  if (selectedColor || product.color) details.push(`Selected Color: ${selectedColor || product.color}`)
  if (selectedSize || product.size) details.push(`Selected Size: ${selectedSize || product.size}`)
  if (product.colors?.length) details.push(`Available Colors: ${product.colors.join(', ')}`)
  if (product.sizes?.length) details.push(`Available Sizes: ${product.sizes.join(', ')}`)
  if (product.inStock !== undefined) details.push(`Stock: ${product.inStock ? 'In Stock' : 'Out of Stock'}`)
  return details.join(' | ')
}

function formatCartContext(cart) {
  if (!cart || !cart.items || cart.items.length === 0) return 'Cart is empty (0 items, $0.00)'
  const itemDescs = cart.items.map(
    (i) => `${i.quantity}x ${i.name}${i.size ? ` (Size ${i.size})` : ''}${i.color ? ` (${i.color})` : ''} - $${((i.price || 0) * i.quantity).toFixed(2)}`
  )
  return `${cart.totalItems || cart.items.length} items ($${(cart.totalPrice || 0).toFixed(2)} total): [${itemDescs.join('; ')}]`
}
