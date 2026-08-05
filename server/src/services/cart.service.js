import { ApiError } from '../utils/api-error.js'
import { env } from '../config/env.js'
import * as cartModel from '../models/cart.model.js'
import * as variantModel from '../models/variant.model.js'
import * as productModel from '../models/product.model.js'
import { CACHE_TTL } from '../utils/constants.js'
import { deleteCached, getCachedJson, setCachedJson } from './cache.service.js'

const cacheKey = (userId) => `customer:${userId}:cart`

async function currentCart(userId, { bypassCache = false } = {}) {
  const key = cacheKey(userId)
  if (!bypassCache) {
    const cached = await getCachedJson(key)
    if (cached) return cached
  }
  const items = await cartModel.findByUser(userId)
  await setCachedJson(key, items, CACHE_TTL.CART)
  return items
}

async function resolveBuyableVariant(variantPublicId, quantity) {
  const variant = await variantModel.findByPublicId(variantPublicId)
  if (!variant || variant.isActive === false) {
    throw ApiError.notFound('That product option is no longer available.')
  }
  const product = await productModel.findByInternalId(variant.productId)
  if (!product || product.status !== 'active') {
    throw ApiError.conflict('That product is no longer available.')
  }
  const available = Number(variant.available ?? 0)
  if (available < quantity) {
    throw ApiError.insufficientStock(
      available === 0
        ? `"${product.name}" in size ${variant.size} is sold out.`
        : `Only ${available} left of "${product.name}" in size ${variant.size}.`
    )
  }
  return variant
}

async function refresh(userId) {
  await deleteCached(cacheKey(userId))
  return currentCart(userId, { bypassCache: true })
}

export async function get(userId) {
  return currentCart(userId)
}

export async function addItem(userId, { variantId, quantity }) {
  const variant = await resolveBuyableVariant(variantId, quantity)
  await cartModel.mergeItem(userId, variant.internalId, variant.publicId, quantity)
  return refresh(userId)
}

export async function setItem(userId, { variantId, quantity }) {
  const variant = await resolveBuyableVariant(variantId, quantity)
  await cartModel.setItem(userId, variant.internalId, variant.publicId, quantity)
  return refresh(userId)
}

/** Merge an anonymous browser cart into the signed-in cart without doubling. */
export async function sync(userId, items) {
  for (const item of items) {
    try {
      const variant = await resolveBuyableVariant(item.variantId, item.quantity)
      await cartModel.mergeItem(
        userId,
        variant.internalId,
        variant.publicId,
        Math.min(item.quantity, env.business.maxQtyPerLine)
      )
    } catch (error) {
      // A stale guest item should not prevent the rest of the account cart from
      // loading. Invalid/sold-out lines are deliberately skipped.
      if (!error.statusCode) throw error
    }
  }
  return refresh(userId)
}

export async function removeItem(userId, variantPublicId) {
  const variant = await variantModel.findByPublicId(variantPublicId)
  if (variant) {
    await cartModel.removeItem(userId, variant.internalId, variant.publicId)
  }
  return refresh(userId)
}

export async function clear(userId) {
  await cartModel.clearByUser(userId)
  await deleteCached(cacheKey(userId))
  return []
}

export async function invalidateCartCache(userId) {
  await deleteCached(cacheKey(userId))
}
