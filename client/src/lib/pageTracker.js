/**
 * Reports which page the customer is currently viewing to the server over the
 * socket (`page:update`). Voice handlers (select_variant, get_current_page)
 * use this to act on the page actually open on screen — whether the customer
 * got there via the agent, a manual click, or the browser back button.
 */
import { getSocket } from './socket'
import { store } from '../store'

let lastEmitted = null

function parseLocation() {
  const path = window.location.pathname
  const search = window.location.search
  const params = new URLSearchParams(search)

  // /product/{slug} — product detail page
  const productMatch = path.match(/^\/product\/([^/]+)/)
  if (productMatch) {
    return {
      path: path + search,
      type: 'product',
      slug: decodeURIComponent(productMatch[1]),
      color: params.get('color') || null,
      size: params.get('size') || null,
    }
  }

  // /products — catalog page (filters live in the query string)
  if (path.startsWith('/products')) {
    return {
      path: path + search,
      type: 'catalog',
      slug: null,
      color: params.get('color') || null,
      size: params.get('size') || null,
    }
  }

  return { path: path + search, type: 'page', slug: null, color: null, size: null }
}

/** Build the current page snapshot, merging the Redux selection on product pages. */
export function buildPageInfo(selection = null) {
  const base = parseLocation()
  if (base.type === 'product' && selection) {
    // The store selection is the ground truth; URL params are the fallback
    // (e.g. before the product data has loaded).
    return {
      ...base,
      color: selection.color || base.color,
      size: selection.size || base.size,
    }
  }
  return base
}

/** Send the snapshot if the socket exists and nothing identical was sent. */
export function emitPageUpdate(info) {
  const socket = getSocket()
  if (!socket) return
  const snapshot = JSON.stringify(info)
  if (snapshot === lastEmitted) return
  lastEmitted = snapshot
  socket.emit('page:update', info)
}

/** Force a fresh report (used when a voice call starts, in case the socket
 *  connected after the last navigation). */
export function emitCurrentPage() {
  lastEmitted = null
  const selection = store.getState()?.productView || null
  emitPageUpdate(buildPageInfo(selection))
}
