import { ApiError } from '../utils/api-error.js'
import { env } from '../config/env.js'
import * as favouriteModel from '../models/favourite.model.js'
import * as productModel from '../models/product.model.js'
import { deleteCached, getCachedJson, setCachedJson } from './cache.service.js'

const cacheKey = (userId) => `customer:${userId}:favourites`

async function currentFavourites(userId, { bypassCache = false } = {}) {
  const key = cacheKey(userId)
  if (!bypassCache) {
    const cached = await getCachedJson(key)
    if (cached) return cached
  }
  const products = await favouriteModel.findByUser(userId)
  await setCachedJson(key, products, env.redis.cacheTtlSeconds)
  return products
}

async function refresh(userId) {
  await deleteCached(cacheKey(userId))
  return currentFavourites(userId, { bypassCache: true })
}

export async function get(userId) {
  return currentFavourites(userId)
}

export async function add(userId, productPublicId) {
  const product = await productModel.findByPublicId(productPublicId)
  if (!product || product.status !== 'active') {
    throw ApiError.notFound('Product not found.')
  }
  await favouriteModel.add(userId, product.internalId || product.id, product.id)
  return refresh(userId)
}

export async function remove(userId, productPublicId) {
  const product = await productModel.findByPublicId(productPublicId, { includeDeleted: true })
  if (product) {
    await favouriteModel.remove(userId, product.internalId || product.id, product.id)
  }
  return refresh(userId)
}

export async function sync(userId, productIds) {
  for (const productId of productIds) {
    const product = await productModel.findByPublicId(productId)
    if (product?.status === 'active') {
      await favouriteModel.add(userId, product.internalId || product.id, product.id)
    }
  }
  return refresh(userId)
}
