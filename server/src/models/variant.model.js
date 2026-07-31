import { pool, query, queryOne } from '../config/database.js'

export function mapVariant(row) {
  if (!row) return null
  const stock = Number(row.stock)
  const reserved = Number(row.reserved)
  return {
    id: row.public_id,
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
  return {
    id: variant.id,
    size: variant.size,
    color: variant.color,
    available: variant.available,
    inStock: variant.inStock,
  }
}

export async function findByProduct(productInternalId, { activeOnly = false } = {}) {
  const rows = await query(
    `SELECT * FROM product_variants
     WHERE product_id = ? ${activeOnly ? 'AND is_active = TRUE' : ''}
     ORDER BY CAST(size AS UNSIGNED), color`,
    [productInternalId]
  )
  return rows.map(mapVariant)
}

export async function findByPublicId(publicId) {
  return mapVariant(
    await queryOne('SELECT * FROM product_variants WHERE public_id = ? LIMIT 1', [publicId])
  )
}

export async function skuExists(sku, ignoreInternalId = null) {
  const row = ignoreInternalId
    ? await queryOne('SELECT 1 AS x FROM product_variants WHERE sku = ? AND id <> ? LIMIT 1', [sku, ignoreInternalId])
    : await queryOne('SELECT 1 AS x FROM product_variants WHERE sku = ? LIMIT 1', [sku])
  return Boolean(row)
}

export async function create(data, conn = pool) {
  const [result] = await conn.query(
    `INSERT INTO product_variants (public_id, product_id, size, color, sku, stock, is_active)
     VALUES (?,?,?,?,?,?,?)`,
    [data.publicId, data.productInternalId, data.size, data.color, data.sku,
     data.stock ?? 0, data.isActive === false ? 0 : 1]
  )
  return result.insertId
}

/**
 * Adjusts absolute stock (admin edit / restock).
 * Guarded so stock can never drop below what's already reserved.
 */
export async function setStock(internalId, stock, conn = pool) {
  const [result] = await conn.query(
    'UPDATE product_variants SET stock = ? WHERE id = ? AND ? >= reserved',
    [stock, internalId, stock]
  )
  return (result.affectedRows ?? 0) > 0
}

export async function deleteByProduct(productInternalId, conn = pool) {
  await conn.query('DELETE FROM product_variants WHERE product_id = ?', [productInternalId])
}

export async function deleteById(internalId, conn = pool) {
  await conn.query('DELETE FROM product_variants WHERE id = ?', [internalId])
}

/**
 * Locks the given variants FOR UPDATE and returns them with product info.
 *
 * This is THE critical query for checkout: any other transaction touching
 * these rows blocks until we commit, which is what prevents two shoppers
 * buying the last pair simultaneously.
 *
 * Rows are locked in ascending id order to avoid deadlocking against another
 * checkout that wants the same variants in a different order.
 */
export async function lockForUpdate(variantPublicIds, conn) {
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
}

/** Holds stock for an in-flight checkout. */
export async function reserve(internalId, quantity, conn) {
  const [result] = await conn.query(
    `UPDATE product_variants
     SET reserved = reserved + ?
     WHERE id = ? AND (stock - reserved) >= ?`,
    [quantity, internalId, quantity]
  )
  return (result.affectedRows ?? 0) > 0
}

/** Payment failed or the order expired — put the stock back on sale. */
export async function releaseReservation(internalId, quantity, conn = pool) {
  await conn.query(
    'UPDATE product_variants SET reserved = GREATEST(0, reserved - ?) WHERE id = ?',
    [quantity, internalId]
  )
}

/** Payment succeeded — the reservation becomes a real deduction. */
export async function commitReservation(internalId, quantity, conn) {
  const [result] = await conn.query(
    `UPDATE product_variants
     SET stock = GREATEST(0, stock - ?), reserved = GREATEST(0, reserved - ?)
     WHERE id = ?`,
    [quantity, quantity, internalId]
  )
  return (result.affectedRows ?? 0) > 0
}

/** Customer returned an item — stock goes back. */
export async function restock(internalId, quantity, conn = pool) {
  await conn.query('UPDATE product_variants SET stock = stock + ? WHERE id = ?', [
    quantity, internalId,
  ])
}

/** Sizes that actually have stock, for the storefront filter UI. */
export async function availableSizes() {
  const rows = await query(
    `SELECT DISTINCT v.size FROM product_variants v
     JOIN products p ON p.id = v.product_id
     WHERE p.status = 'active' AND p.deleted_at IS NULL
       AND v.is_active = TRUE AND (v.stock - v.reserved) > 0
     ORDER BY CAST(v.size AS UNSIGNED)`
  )
  return rows.map((r) => r.size)
}
