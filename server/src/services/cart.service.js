import { ApiError } from '../utils/api-error.js';
import { env } from '../config/env.js';
import * as cartModel from '../models/cart.model.js';
import * as variantModel from '../models/variant.model.js';
import * as productModel from '../models/product.model.js';
import * as userModel from '../models/user.model.js';
import { isDatabaseConnected } from '../config/database.js';
import { CACHE_TTL } from '../utils/constants.js';
import { deleteCached, getCachedJson, setCachedJson } from './cache.service.js';

const cacheKey = (userId) => `customer:${userId}:cart`;

// ── User-id resolution ────────────────────────────────────────────────────
// Retell / socket pass the ULID public_id (e.g. "01KZN..."), but MySQL
// cart_items.user_id is BIGINT UNSIGNED (internal auto-increment).  When the
// DB is connected we must translate public_id → internalId; when running in
// memory-fallback mode we keep the raw string so the Map keys stay consistent.
export async function resolveCartUserId(userId) {
  if (!userId || userId === 'guest') return null;
  // Already a numeric internal id (e.g. from authenticated REST routes)
  if (typeof userId === 'number' || /^\d+$/.test(String(userId)))
    return Number(userId);
  if (!isDatabaseConnected()) return String(userId);
  try {
    const user = await userModel.findByPublicId(String(userId));
    if (user?.internalId) return user.internalId;
    // Memory users have publicId like "USR-CUST1" – keep as string fallback
    if (user?.id) return user.internalId || String(userId);
  } catch {}
  // If not found in DB but DB is connected, the id is invalid – let caller fail gracefully
  return null;
}

async function resolvedIdOrFail(userId) {
  const resolved = await resolveCartUserId(userId);
  if (resolved === null || resolved === undefined) {
    throw ApiError.unauthorized('Please sign in to use your cart.');
  }
  return resolved;
}

async function currentCart(userId, { bypassCache = false } = {}) {
  const key = cacheKey(userId);
  if (!bypassCache) {
    const cached = await getCachedJson(key);
    if (cached) return cached;
  }
  const items = await cartModel.findByUser(userId);
  await setCachedJson(key, items, CACHE_TTL.CART);
  return items;
}

async function resolveBuyableVariant(variantPublicId, quantity) {
  const variant = await variantModel.findByPublicId(variantPublicId);
  if (!variant || variant.isActive === false) {
    throw ApiError.notFound('That product option is no longer available.');
  }
  const product = await productModel.findByInternalId(variant.productId);
  if (!product || product.status !== 'active') {
    throw ApiError.conflict('That product is no longer available.');
  }
  const available = Number(variant.available ?? 0);
  if (available < quantity) {
    throw ApiError.insufficientStock(
      available === 0
        ? `"${product.name}" in size ${variant.size} is sold out.`
        : `Only ${available} left of "${product.name}" in size ${variant.size}.`
    );
  }
  return variant;
}

async function refresh(userId) {
  await deleteCached(cacheKey(userId));
  return currentCart(userId, { bypassCache: true });
}

export async function get(userId) {
  const rid = (await resolveCartUserId(userId)) ?? String(userId);
  return currentCart(rid);
}

export async function addItem(userId, { variantId, quantity }) {
  const rid = await resolvedIdOrFail(userId);
  const variant = await resolveBuyableVariant(variantId, quantity);
  await cartModel.mergeItem(
    rid,
    variant.internalId,
    variant.publicId,
    quantity
  );
  return refresh(rid);
}

export async function setItem(userId, { variantId, quantity }) {
  const rid = await resolvedIdOrFail(userId);
  const variant = await resolveBuyableVariant(variantId, quantity);
  await cartModel.setItem(rid, variant.internalId, variant.publicId, quantity);
  return refresh(rid);
}

/** Merge an anonymous browser cart into the signed-in cart without doubling. */
export async function sync(userId, items) {
  const rid = await resolvedIdOrFail(userId);
  for (const item of items) {
    try {
      const variant = await resolveBuyableVariant(
        item.variantId,
        item.quantity
      );
      await cartModel.mergeItem(
        rid,
        variant.internalId,
        variant.publicId,
        Math.min(item.quantity, env.business.maxQtyPerLine)
      );
    } catch (error) {
      // A stale guest item should not prevent the rest of the account cart from
      // loading. Invalid/sold-out lines are deliberately skipped.
      if (!error.statusCode) throw error;
    }
  }
  return refresh(rid);
}

export async function removeItem(userId, variantPublicId) {
  const rid = (await resolveCartUserId(userId)) ?? String(userId);
  const variant = await variantModel.findByPublicId(variantPublicId);
  if (variant) {
    await cartModel.removeItem(rid, variant.internalId, variant.publicId);
  } else {
    // Fallback: try direct DB delete by public_id (for stale/archived variants) and memory store
    try {
      if (isDatabaseConnected()) {
        const { pool } = await import('../config/database.js');
        await pool.query(
          'DELETE ci FROM cart_items ci JOIN product_variants v ON v.id = ci.variant_id WHERE ci.user_id = ? AND v.public_id = ?',
          [rid, String(variantPublicId)]
        );
      }
      // also try memory store path
      await cartModel.removeItem(rid, null, String(variantPublicId));
    } catch {}
  }
  return refresh(rid);
}

export async function clear(userId) {
  const rid = (await resolveCartUserId(userId)) ?? String(userId);
  await cartModel.clearByUser(rid);
  await deleteCached(cacheKey(rid));
  return [];
}

export async function invalidateCartCache(userId) {
  const rid = (await resolveCartUserId(userId)) ?? String(userId);
  await deleteCached(cacheKey(rid));
}
