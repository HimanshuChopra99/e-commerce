/** Values shared with the frontend. Keep these in sync with the admin UI. */

export const ROLES = Object.freeze({ CUSTOMER: 'customer', ADMIN: 'admin' });

/**
 * Per-type Redis cache TTLs (seconds). Different data changes at different
 * rates, so each cache category gets its own lifetime:
 *   - PRODUCTS    300s  (5 min)   — catalogue list / featured grid
 *   - PRODUCT     900s  (15 min)  — single product detail / related
 *   - CATEGORIES 3600s  (1 hour)  — category list
 *   - FILTERS    3600s  (1 hour)  — filter facets (sizes/colors/genders)
 *   - CART       1800s  (30 min)  — customer cart / favourites / orders
 *
 * All public catalogue keys are additionally invalidated on any product,
 * category, stock or payment change, so the TTL is just a safety net.
 */
export const CACHE_TTL = Object.freeze({
  PRODUCTS: 300,
  PRODUCT: 900,
  CATEGORIES: 3600,
  FILTERS: 3600,
  CART: 1800,
});

export const USER_STATUS = Object.freeze(['active', 'blocked']);

export const PRODUCT_STATUS = Object.freeze([
  'active',
  'draft',
  'archived',
  'out_of_stock',
]);

export const GENDERS = Object.freeze(['men', 'women', 'unisex', 'kids']);

export const SIZES = Object.freeze([
  // EU sizes (used in seed data and memory store)
  '35',
  '36',
  '37',
  '38',
  '39',
  '40',
  '41',
  '42',
  '43',
  '44',
  '45',
  '46',
  '47',
  '48',
  '49',
  '50',
  // US sizes
  '5',
  '5.5',
  '6',
  '6.5',
  '7',
  '7.5',
  '8',
  '8.5',
  '9',
  '9.5',
  '10',
  '10.5',
  '11',
  '11.5',
  '12',
  '12.5',
  '13',
]);

export const COLORS = Object.freeze([
  'Black',
  'White',
  'Grey',
  'Navy',
  'Red',
  'Blue',
  'Green',
  'Brown',
  'Tan',
  'Beige',
  'Pink',
  'Yellow',
]);

export const MATERIALS = Object.freeze([
  'Genuine Leather',
  'Synthetic Leather',
  'Canvas',
  'Mesh',
  'Suede',
  'Knit',
  'Rubber',
  'Nubuck',
]);

export const CATEGORY_COLORS = Object.freeze([
  'slate',
  'blue',
  'teal',
  'amber',
  'rose',
  'violet',
]);

export const ORDER_STATUS = Object.freeze([
  'pending',
  'processing',
  'ready_for_pickup',
  'assigned',
  'shipping',
  'delivered',
  'cancelled',
  'returned',
]);

export const PAYMENT_STATUS = Object.freeze([
  'pending',
  'paid',
  'failed',
  'refunded',
]);

export const PAYMENT_METHODS = Object.freeze([
  'card',
  'upi',
  'paypal',
  'cod',
  'net_banking',
]);

export const COURIERS = Object.freeze([
  'BlueDart',
  'Delhivery',
  'FedEx',
  'DHL',
  'DTDC',
]);

/**
 * Which order status may follow which.
 * Enforced in order.service.js — an invalid jump returns 400.
 *
 *   pending -> processing -> ready_for_pickup -> assigned -> shipping -> delivered -> returned
 *      |            |
 *      +------------+--> cancelled  (terminal)
 */
export const ORDER_TRANSITIONS = Object.freeze({
  pending: ['processing', 'cancelled'],
  processing: ['ready_for_pickup', 'cancelled'],
  ready_for_pickup: ['assigned'],
  assigned: ['shipping'],
  shipping: ['delivered', 'returned'],
  delivered: ['returned'],
  cancelled: [],
  returned: [],
});

/** Loyalty tiers, derived from lifetime spend — never stored. */
export const TIER_THRESHOLDS = Object.freeze([
  { tier: 'platinum', min: 2500 },
  { tier: 'gold', min: 1200 },
  { tier: 'silver', min: 500 },
  { tier: 'bronze', min: 0 },
]);

export function tierForSpend(spend) {
  const n = Number(spend) || 0;
  return TIER_THRESHOLDS.find((t) => n >= t.min).tier;
}

export const DELIVERY_PARTNER_ROLE = 'delivery_partner';
