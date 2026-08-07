/**
 * Per-user "where is the customer right now" state.
 *
 * The client reports the current page over the socket (`page:update`) and
 * voice handlers (select_variant, get_current_page) consume it here, so the
 * agent always acts on the page the customer actually has open — regardless
 * of whether they got there via the agent, a manual click, or the browser
 * back button.
 *
 * In-memory Map is fine for a single instance. If the API ever runs behind a
 * load balancer with multiple processes, swap this for Redis (same interface).
 */

const TTL_MS = 30 * 60 * 1000 // stale entries expire after 30 minutes

const pageStates = new Map() // userId -> { path, type, slug, color, size, updatedAt }

export function setPageState(userId, info = {}) {
  if (!userId) return
  pageStates.set(String(userId), {
    path: info.path || '',
    type: info.type || 'unknown',
    slug: info.slug || null,
    color: info.color || null,
    size: info.size || null,
    updatedAt: Date.now(),
  })
}

export function getPageState(userId) {
  if (!userId) return null
  const state = pageStates.get(String(userId))
  if (!state) return null
  if (Date.now() - state.updatedAt > TTL_MS) {
    pageStates.delete(String(userId))
    return null
  }
  return state
}

export function clearPageState(userId) {
  if (userId) pageStates.delete(String(userId))
}

export function getPageStateCount() {
  return pageStates.size
}
