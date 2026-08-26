/**
 * Per-user "where is the customer right now and what are they doing" state.
 *
 * The client reports state over socket (`page:update`, `cart:action`, etc.) and
 * voice handlers + Retell sync service consume it here so the agent always knows
 * the exact page, active filters, product details, cart summary, and user actions.
 */

const TTL_MS = 30 * 60 * 1000; // stale entries expire after 30 minutes

const pageStates = new Map(); // userId -> rich state object

export function setPageState(userId, info = {}) {
  if (!userId) return;
  const current = pageStates.get(String(userId)) || {};

  pageStates.set(String(userId), {
    path: info.path !== undefined ? info.path : current.path || '',
    type: info.type !== undefined ? info.type : current.type || 'unknown',
    slug: info.slug !== undefined ? info.slug : current.slug || null,
    color: info.color !== undefined ? info.color : current.color || null,
    size: info.size !== undefined ? info.size : current.size || null,
    filters:
      info.filters !== undefined ? info.filters : current.filters || null,
    productDetails:
      info.productDetails !== undefined
        ? info.productDetails
        : current.productDetails || null,
    cartSummary:
      info.cartSummary !== undefined
        ? info.cartSummary
        : current.cartSummary || null,
    lastAction:
      info.lastAction !== undefined
        ? info.lastAction
        : current.lastAction || 'Navigated page',
    callId: info.callId !== undefined ? info.callId : current.callId || null,
    updatedAt: Date.now(),
  });
}

export function setCallId(userId, callId) {
  if (!userId) return;
  const current = pageStates.get(String(userId)) || {};
  pageStates.set(String(userId), {
    ...current,
    callId: callId || null,
    updatedAt: Date.now(),
  });
}

export function getPageState(userId) {
  if (!userId) return null;
  const state = pageStates.get(String(userId));
  if (!state) return null;
  if (Date.now() - state.updatedAt > TTL_MS) {
    pageStates.delete(String(userId));
    return null;
  }
  return state;
}

export function clearPageState(userId) {
  if (userId) pageStates.delete(String(userId));
}

export function getPageStateCount() {
  return pageStates.size;
}
