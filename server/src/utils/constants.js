/** Values shared with the frontend. Keep these in sync with the admin UI. */

export const ROLES = Object.freeze({ CUSTOMER: 'customer', ADMIN: 'admin' })

export const USER_STATUS = Object.freeze(['active', 'blocked'])

export const PRODUCT_STATUS = Object.freeze([
  'active',
  'draft',
  'archived',
  'out_of_stock',
])

export const GENDERS = Object.freeze(['men', 'women', 'unisex', 'kids'])

export const SIZES = Object.freeze(['5', '6', '7', '8', '9', '10', '11', '12'])

export const COLORS = Object.freeze([
  'Black', 'White', 'Grey', 'Navy', 'Red', 'Blue',
  'Green', 'Brown', 'Tan', 'Beige', 'Pink', 'Yellow',
])

export const MATERIALS = Object.freeze([
  'Genuine Leather', 'Synthetic Leather', 'Canvas', 'Mesh',
  'Suede', 'Knit', 'Rubber', 'Nubuck',
])

export const CATEGORY_COLORS = Object.freeze([
  'slate', 'blue', 'teal', 'amber', 'rose', 'violet',
])

export const ORDER_STATUS = Object.freeze([
  'pending', 'processing', 'shipped', 'delivered', 'cancelled', 'returned',
])

export const PAYMENT_STATUS = Object.freeze([
  'pending', 'paid', 'failed', 'refunded',
])

export const PAYMENT_METHODS = Object.freeze([
  'card', 'upi', 'paypal', 'cod', 'net_banking',
])

export const COURIERS = Object.freeze([
  'BlueDart', 'Delhivery', 'FedEx', 'DHL', 'DTDC',
])

/**
 * Which order status may follow which.
 * Enforced in order.service.js — an invalid jump returns 400.
 *
 *   pending -> processing -> shipped -> delivered -> returned
 *      |            |
 *      +------------+--> cancelled  (terminal)
 */
export const ORDER_TRANSITIONS = Object.freeze({
  pending: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered', 'returned'],
  delivered: ['returned'],
  cancelled: [],
  returned: [],
})

/** Loyalty tiers, derived from lifetime spend — never stored. */
export const TIER_THRESHOLDS = Object.freeze([
  { tier: 'platinum', min: 2500 },
  { tier: 'gold', min: 1200 },
  { tier: 'silver', min: 500 },
  { tier: 'bronze', min: 0 },
])

export function tierForSpend(spend) {
  const n = Number(spend) || 0
  return TIER_THRESHOLDS.find((t) => n >= t.min).tier
}
