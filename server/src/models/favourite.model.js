import { pool, isDatabaseConnected } from '../config/database.js'
import * as productModel from './product.model.js'
import { memoryStore } from '../services/memory-store.js'
import * as userModel from './user.model.js'

const ULID_RE = /^[0-9A-HJKMNP-TV-Z]{26}$/i

async function resolveInternalUserId(userId) {
  if (ULID_RE.test(String(userId))) {
    const user = await userModel.findByPublicId(userId)
    if (!user?.internalId) throw new Error(`User not found for public_id: ${userId}`)
    return user.internalId
  }
  return userId
}

const FAVOURITES_SELECT = `
  SELECT p.*,
         c.public_id AS category_public_id,
         c.name AS category_name,
         c.slug AS category_slug,
         EXISTS (
           SELECT 1 FROM product_variants v
           WHERE v.product_id = p.id
             AND v.is_active = TRUE
             AND (v.stock - v.reserved) > 0
         ) AS in_stock
  FROM favourites f
  JOIN products p ON p.id = f.product_id
  LEFT JOIN categories c ON c.id = p.category_id
  WHERE f.user_id = ? AND p.deleted_at IS NULL AND p.status = 'active'
  ORDER BY f.created_at DESC, f.id DESC
`

export async function findByUser(userId, conn = pool) {
  if (isDatabaseConnected()) {
    try {
      const internalId = await resolveInternalUserId(userId)
      const [rows] = await conn.query(FAVOURITES_SELECT, [internalId])
      return rows.map(productModel.mapProduct).map(productModel.toPublicProduct)
    } catch {
      // Development can continue through the in-memory fallback.
    }
  }

  return memoryStore
    .getFavourites(userId)
    .map((productId) => memoryStore.getProductByPublicId(productId))
    .filter((product) => product?.status === 'active' && !product.deletedAt)
    .map(productModel.toPublicProduct)
}

export async function add(userId, productInternalId, productPublicId, conn = pool) {
  if (isDatabaseConnected()) {
    const internalUserId = await resolveInternalUserId(userId)
    const [result] = await conn.query(
      'INSERT IGNORE INTO favourites (user_id, product_id) VALUES (?,?)',
      [internalUserId, productInternalId]
    )
    return result.affectedRows > 0
  }
  memoryStore.addFavourite(userId, productPublicId)
  return true
}

export async function remove(userId, productInternalId, productPublicId, conn = pool) {
  if (isDatabaseConnected()) {
    const internalUserId = await resolveInternalUserId(userId)
    const [result] = await conn.query(
      'DELETE FROM favourites WHERE user_id = ? AND product_id = ?',
      [internalUserId, productInternalId]
    )
    return result.affectedRows > 0
  }
  memoryStore.removeFavourite(userId, productPublicId)
  return true
}
