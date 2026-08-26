import { ApiError } from '../utils/api-error.js';
import * as favouriteModel from '../models/favourite.model.js';
import * as productModel from '../models/product.model.js';
import * as userModel from '../models/user.model.js';
import { isDatabaseConnected } from '../config/database.js';
import { CACHE_TTL } from '../utils/constants.js';
import { deleteCached, getCachedJson, setCachedJson } from './cache.service.js';

const cacheKey = (userId) => `customer:${userId}:favourites`;

async function resolveFavUserId(userId) {
  if (!userId || userId === 'guest') return null;
  if (typeof userId === 'number' || /^\d+$/.test(String(userId)))
    return Number(userId);
  if (!isDatabaseConnected()) return String(userId);
  try {
    const user = await userModel.findByPublicId(String(userId));
    if (user?.internalId) return user.internalId;
  } catch {}
  return null;
}
async function resolvedFavIdOrFail(userId) {
  const rid = await resolveFavUserId(userId);
  if (rid === null)
    throw ApiError.unauthorized('Please sign in to save favourites.');
  return rid;
}

async function currentFavourites(rid, { bypassCache = false } = {}) {
  const key = cacheKey(rid);
  if (!bypassCache) {
    const cached = await getCachedJson(key);
    if (cached) return cached;
  }
  const products = await favouriteModel.findByUser(rid);
  await setCachedJson(key, products, CACHE_TTL.CART);
  return products;
}

async function refresh(rid) {
  await deleteCached(cacheKey(rid));
  return currentFavourites(rid, { bypassCache: true });
}

export async function get(userId) {
  const rid = (await resolveFavUserId(userId)) ?? String(userId);
  return currentFavourites(rid);
}

export async function add(userId, productPublicId) {
  const rid = await resolvedFavIdOrFail(userId);
  const product = await productModel.findByPublicId(productPublicId);
  if (!product || product.status !== 'active') {
    throw ApiError.notFound('Product not found.');
  }
  await favouriteModel.add(rid, product.internalId || product.id, product.id);
  return refresh(rid);
}

export async function remove(userId, productPublicId) {
  const rid = (await resolveFavUserId(userId)) ?? String(userId);
  const product = await productModel.findByPublicId(productPublicId, {
    includeDeleted: true,
  });
  if (product) {
    await favouriteModel.remove(
      rid,
      product.internalId || product.id,
      product.id
    );
  }
  return refresh(rid);
}

export async function sync(userId, productIds) {
  const rid = await resolvedFavIdOrFail(userId);
  for (const productId of productIds) {
    const product = await productModel.findByPublicId(productId);
    if (product?.status === 'active') {
      await favouriteModel.add(
        rid,
        product.internalId || product.id,
        product.id
      );
    }
  }
  return refresh(rid);
}
