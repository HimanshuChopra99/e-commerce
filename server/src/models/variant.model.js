import { pool, query, queryOne, isDatabaseConnected } from '../config/database.js'
import { memoryStore } from '../services/memory-store.js'

export function mapVariant(row) {
  if (!row) return null
  const stock = Number(row.stock)
  const reserved = Number(row.reserved)
  return {
    id: row.public_id,
    publicId: row.public_id,
    internalId: row.id,
    productId: row.product_id,
    size: row.size,
    color: row.color,
    sku: row.sku,
    stock,
    reserved,
    available: stock - reserved,
    inStock: stock - reserved > 0,
    isActive: Boolean(row.is_active),
  }
}

/** What the storefront sees — no raw stock numbers, no internal ids. */
export function toPublicVariant(variant) {
  if (!variant) return null
  const stock = Number(variant.stock ?? variant.available ?? 0)
  const reserved = Number(variant.reserved ?? 0)
  const available = variant.available !== undefined && variant.stock === undefined
    ? Number(variant.available)
    : (stock - reserved)
  return {
    id: variant.publicId || variant.id,
    size: variant.size,
    color: variant.color,
    available,
    inStock: available > 0,
  }
}

export async function findByProduct(productInternalId, { activeOnly = false } = {}) {
  if (isDatabaseConnected()) {
    try {
      const rows = await query(
        `SELECT * FROM product_variants
         WHERE product_id = ? ${activeOnly ? 'AND is_active = TRUE' : ''}
         ORDER BY CAST(size AS UNSIGNED), color`,
        [productInternalId]
      )
      if (rows && rows.length > 0) return rows.map(mapVariant)
    } catch {}
  }

  const product = memoryStore.products.find(
    (p) => p.internalId === productInternalId || p.id === productInternalId || p.publicId === productInternalId
  )
  if (!product || !product.variants) return []
  return product.variants
    .filter((v) => (activeOnly ? v.isActive !== false : true))
    .map((v) => ({
      id: v.publicId || v.id,
      publicId: v.publicId || v.id,
      internalId: v.internalId || v.id,
      productId: productInternalId,
      size: v.size,
      color: v.color,
      sku: v.sku || `${product.sku}-${v.size}-${v.color}`,
      stock: v.stock ?? 10,
      reserved: v.reserved ?? 0,
      available: (v.stock ?? 10) - (v.reserved ?? 0),
      inStock: (v.stock ?? 10) - (v.reserved ?? 0) > 0,
      isActive: v.isActive !== false,
    }))
}

export async function findByPublicId(publicId) {
  if (isDatabaseConnected()) {
    try {
      const row = await queryOne('SELECT * FROM product_variants WHERE public_id = ? LIMIT 1', [publicId])
      if (row) return mapVariant(row)
    } catch {}
  }
  for (const prod of memoryStore.products) {
    const v = prod.variants?.find((v) => v.publicId === publicId || v.id === publicId)
    if (v) {
      return {
        id: v.publicId || v.id,
        publicId: v.publicId || v.id,
        internalId: v.internalId || v.id,
        productId: prod.id,
        size: v.size,
        color: v.color,
        sku: v.sku || `${prod.sku}-${v.size}-${v.color}`,
        stock: v.stock ?? 10,
        reserved: v.reserved ?? 0,
        available: (v.stock ?? 10) - (v.reserved ?? 0),
        inStock: (v.stock ?? 10) - (v.reserved ?? 0) > 0,
        isActive: v.isActive !== false,
      }
    }
  }
  return null
}

export async function skuExists(sku, ignoreInternalId = null) {
  if (isDatabaseConnected()) {
    try {
      const row = ignoreInternalId
        ? await queryOne('SELECT 1 AS x FROM product_variants WHERE sku = ? AND id <> ? LIMIT 1', [sku, ignoreInternalId])
        : await queryOne('SELECT 1 AS x FROM product_variants WHERE sku = ? LIMIT 1', [sku])
      if (row) return true
    } catch {}
  }
  return false
}

export async function create(data, conn = pool) {
  if (isDatabaseConnected()) {
    try {
      const [result] = await conn.query(
        `INSERT INTO product_variants (public_id, product_id, size, color, sku, stock, is_active)
         VALUES (?,?,?,?,?,?,?)`,
        [data.publicId, data.productInternalId, data.size, data.color, data.sku,
         data.stock ?? 0, data.isActive === false ? 0 : 1]
      )
      return result.insertId
    } catch {}
  }
  return 1
}

/**
 * Adjusts absolute stock (admin edit / restock).
 * Guarded so stock can never drop below what's already reserved.
 */
export async function setStock(internalId, stock, conn = pool) {
  if (isDatabaseConnected()) {
    try {
      const [result] = await conn.query(
        'UPDATE product_variants SET stock = ? WHERE id = ? AND ? >= reserved',
        [stock, internalId, stock]
      )
      return (result.affectedRows ?? 0) > 0
    } catch {}
  }
  return true
}

export async function deleteByProduct(productInternalId, conn = pool) {
  if (isDatabaseConnected()) {
    try {
      await conn.query('DELETE FROM product_variants WHERE product_id = ?', [productInternalId])
    } catch {}
  }
}

export async function deleteById(internalId, conn = pool) {
  if (isDatabaseConnected()) {
    try {
      await conn.query('DELETE FROM product_variants WHERE id = ?', [internalId])
    } catch {}
  }
}

/**
 * Locks the given variants FOR UPDATE and returns them with product info.
 */
export async function lockForUpdate(variantPublicIds, conn) {
  if (isDatabaseConnected()) {
    try {
      if (!variantPublicIds.length) return []
      const placeholders = variantPublicIds.map(() => '?').join(',')
      const [rows] = await conn.query(
        `SELECT v.id, v.public_id, v.product_id, v.size, v.color, v.sku,
                v.stock, v.reserved, v.is_active,
                p.name AS product_name, p.slug AS product_slug, p.sku AS product_sku,
                p.price, p.status AS product_status, p.images, p.deleted_at
         FROM product_variants v
         JOIN products p ON p.id = v.product_id
         WHERE v.public_id IN (${placeholders})
         ORDER BY v.id
         FOR UPDATE`,
        variantPublicIds
      )
      return rows
    } catch {}
  }
  return []
}

/** Holds stock for an in-flight checkout. */
export async function reserve(internalId, quantity, conn) {
  if (isDatabaseConnected()) {
    try {
      const [result] = await conn.query(
        `UPDATE product_variants
         SET reserved = reserved + ?
         WHERE id = ? AND (stock - reserved) >= ?`,
        [quantity, internalId, quantity]
      )
      return (result.affectedRows ?? 0) > 0
    } catch {}
  }
  return true
}

/** Payment failed or the order expired — put the stock back on sale. */
export async function releaseReservation(internalId, quantity, conn = pool) {
  if (isDatabaseConnected()) {
    try {
      await conn.query(
        'UPDATE product_variants SET reserved = GREATEST(0, reserved - ?) WHERE id = ?',
        [quantity, internalId]
      )
    } catch {}
  }
}

/** Payment succeeded — the reservation becomes a real deduction. */
export async function commitReservation(internalId, quantity, conn) {
  if (isDatabaseConnected()) {
    try {
      const [result] = await conn.query(
        `UPDATE product_variants
         SET stock = GREATEST(0, stock - ?), reserved = GREATEST(0, reserved - ?)
         WHERE id = ?`,
        [quantity, quantity, internalId]
      )
      return (result.affectedRows ?? 0) > 0
    } catch {}
  }
  return true
}

/** Customer returned an item — stock goes back. */
export async function restock(internalId, quantity, conn = pool) {
  if (isDatabaseConnected()) {
    try {
      await conn.query('UPDATE product_variants SET stock = stock + ? WHERE id = ?', [
        quantity, internalId,
      ])
    } catch {}
  }
}

/** Sizes that actually have stock, for the storefront filter UI. */
export async function availableSizes() {
  if (isDatabaseConnected()) {
    try {
      const rows = await query(
        `SELECT DISTINCT v.size FROM product_variants v
         JOIN products p ON p.id = v.product_id
         WHERE p.status = 'active' AND p.deleted_at IS NULL
           AND v.is_active = TRUE AND (v.stock - v.reserved) > 0
         ORDER BY CAST(v.size AS UNSIGNED)`
      )
      if (rows && rows.length > 0) return rows.map((r) => r.size)
    } catch {}
  }
  return ['38', '39', '40', '41', '42', '43', '44', '45']
}
