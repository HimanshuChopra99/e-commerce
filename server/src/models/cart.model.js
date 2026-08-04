import { pool, isDatabaseConnected } from '../config/database.js'
import { parseJson } from '../utils/helpers.js'
import { memoryStore } from '../services/memory-store.js'

function imageForColor(imagesValue, colorImagesValue, color) {
  const colorImages = parseJson(colorImagesValue, [])
  const gallery = Array.isArray(colorImages)
    ? colorImages.find(
      (entry) => entry.color?.toLocaleLowerCase() === String(color).toLocaleLowerCase()
    )
    : null
  return gallery?.images?.[0] ?? parseJson(imagesValue, [])[0] ?? null
}

function mapCartRow(row) {
  const available = Math.max(0, Number(row.stock) - Number(row.reserved))
  return {
    variantId: row.variant_public_id,
    productId: row.product_public_id,
    name: row.product_name,
    slug: row.product_slug,
    image: imageForColor(row.images, row.color_images, row.color),
    price: Number(row.price),
    size: row.size,
    color: row.color,
    quantity: Number(row.quantity),
    available,
    inStock:
      Boolean(row.variant_active) &&
      row.product_status === 'active' &&
      !row.deleted_at &&
      available > 0,
    updatedAt: row.updated_at,
  }
}

const CART_SELECT = `
  SELECT ci.quantity, ci.updated_at,
         v.public_id AS variant_public_id, v.size, v.color, v.stock, v.reserved,
         v.is_active AS variant_active,
         p.public_id AS product_public_id, p.name AS product_name,
         p.slug AS product_slug, p.price, p.images, p.color_images,
         p.status AS product_status, p.deleted_at
  FROM cart_items ci
  JOIN product_variants v ON v.id = ci.variant_id
  JOIN products p ON p.id = v.product_id
  WHERE ci.user_id = ?
  ORDER BY ci.updated_at DESC, ci.id DESC
`

export async function findByUser(userId, conn = pool) {
  if (isDatabaseConnected()) {
    try {
      const [rows] = await conn.query(CART_SELECT, [userId])
      return rows.map(mapCartRow)
    } catch {
      // Development can continue through the in-memory fallback.
    }
  }

  const items = []
  for (const saved of memoryStore.getCart(userId)) {
    for (const product of memoryStore.products) {
      const variant = product.variants?.find(
        (entry) => (entry.publicId || entry.id) === saved.variantId
      )
      if (!variant) continue
      const available = Math.max(
        0,
        Number(variant.stock ?? 0) - Number(variant.reserved ?? 0)
      )
      items.push({
        variantId: variant.publicId || variant.id,
        productId: product.publicId || product.id,
        name: product.name,
        slug: product.slug,
        image: imageForColor(product.images, product.colorImages, variant.color),
        price: Number(product.price),
        size: variant.size,
        color: variant.color,
        quantity: Number(saved.quantity),
        available,
        inStock: product.status === 'active' && variant.isActive !== false && available > 0,
        updatedAt: new Date().toISOString(),
      })
      break
    }
  }
  return items
}

export async function setItem(userId, variantInternalId, variantPublicId, quantity, conn = pool) {
  if (isDatabaseConnected()) {
    const [result] = await conn.query(
      `INSERT INTO cart_items (user_id, variant_id, quantity)
       VALUES (?,?,?)
       ON DUPLICATE KEY UPDATE quantity = VALUES(quantity), updated_at = CURRENT_TIMESTAMP`,
      [userId, variantInternalId, quantity]
    )
    return result.affectedRows > 0
  }
  memoryStore.setCartItem(userId, variantPublicId, quantity)
  return true
}

export async function mergeItem(userId, variantInternalId, variantPublicId, quantity, conn = pool) {
  if (isDatabaseConnected()) {
    const [result] = await conn.query(
      `INSERT INTO cart_items (user_id, variant_id, quantity)
       VALUES (?,?,?)
       ON DUPLICATE KEY UPDATE
         quantity = GREATEST(quantity, VALUES(quantity)),
         updated_at = CURRENT_TIMESTAMP`,
      [userId, variantInternalId, quantity]
    )
    return result.affectedRows > 0
  }
  const existing = memoryStore
    .getCart(userId)
    .find((item) => item.variantId === String(variantPublicId))
  memoryStore.setCartItem(userId, variantPublicId, Math.max(existing?.quantity ?? 0, quantity))
  return true
}

export async function removeItem(userId, variantInternalId, variantPublicId, conn = pool) {
  if (isDatabaseConnected()) {
    const [result] = await conn.query(
      'DELETE FROM cart_items WHERE user_id = ? AND variant_id = ?',
      [userId, variantInternalId]
    )
    return result.affectedRows > 0
  }
  memoryStore.removeCartItem(userId, variantPublicId)
  return true
}

export async function clearByUser(userId, conn = pool) {
  if (isDatabaseConnected()) {
    const [result] = await conn.query('DELETE FROM cart_items WHERE user_id = ?', [userId])
    return result.affectedRows ?? 0
  }
  memoryStore.clearCart(userId)
  return 0
}
