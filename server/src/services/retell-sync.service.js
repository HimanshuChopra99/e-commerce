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

    const actionText = state.lastAction || 'User interacted with browser'
    const pageText = formatPageContext(state)
    const additionalContext = `[LIVE BROWSER UPDATE] Customer location: ${pageText}. Last user action: ${actionText}.`
    const shouldTriggerResponse = actionText.includes('[CRITICAL DIRECTIVE]')

    logger.info({ callId: state.callId, dynamicVariables, additionalContext, shouldTriggerResponse }, '[RetellSync] Updating dynamic variables for active call via updateLive')

    if (typeof retellClient?.call?.updateLive === 'function') {
      await retellClient.call.updateLive(state.callId, {
        call_control: {
          additional_context: additionalContext,
          ...(shouldTriggerResponse ? { trigger_response: true } : {}),
        },
        fields_to_override: {
          override_dynamic_variables: dynamicVariables,
        },
      })
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
  if (!state.path) return 'Home page'
  if (state.type === 'product' && state.productDetails) {
    return `Product detail page for "${state.productDetails.name || state.slug}" (${state.path})`
  }
  if (state.type === 'catalog') {
    return `Product Catalog page (${state.path})`
  }
  return `Page: ${state.path}`
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
