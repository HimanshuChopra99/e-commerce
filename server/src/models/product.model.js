import { pool, query, queryOne } from '../config/database.js'
import { decimalToNumber } from '../utils/money.js'
import { parseJson } from '../utils/helpers.js'

export function mapProduct(row) {
  if (!row) return null
  const images = parseJson(row.images, [])
  return {
    id: row.public_id,
    internalId: row.id,
    name: row.name,
    slug: row.slug,
    sku: row.sku,
    description: row.description,
    brand: row.brand,
    gender: row.gender,
    material: row.material,
    price: decimalToNumber(row.price),
    compareAtPrice: decimalToNumber(row.compare_at_price),
    costPerItem: decimalToNumber(row.cost_per_item),
    status: row.status,
    featured: Boolean(row.is_featured),
    totalStock: Number(row.total_stock),
    unitsSold: Number(row.units_sold),
    rating: decimalToNumber(row.rating_avg) ?? 0,
    reviewCount: Number(row.rating_count),
    images,
    image: images[0] ?? null,
    tags: parseJson(row.tags, []),
    categoryId: row.category_public_id ?? null,
    category: row.category_public_id
      ? { id: row.category_public_id, name: row.category_name, slug: row.category_slug }
      : null,
    inStock: row.in_stock !== undefined ? Boolean(Number(row.in_stock)) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/**
 * Strips fields the storefront must never see.
 * `costPerItem` is your margin — leaking it tells competitors your buy price.
 */
export function toPublicProduct(product) {
  if (!product) return null
  const {
    internalId: _i, costPerItem: _c, unitsSold: _u, status: _s, ...rest
  } = product
  return rest
}

const BASE = `
  SELECT p.*,
         c.public_id AS category_public_id,
         c.name      AS category_name,
         c.slug      AS category_slug,
         EXISTS (SELECT 1 FROM product_variants v
                  WHERE v.product_id = p.id
                    AND v.is_active = TRUE
                    AND (v.stock - v.reserved) > 0) AS in_stock
  FROM products p
  LEFT JOIN categories c ON c.id = p.category_id
`

import { memoryStore } from '../services/memory-store.js'

export async function findByPublicId(publicId, { includeDeleted = false } = {}) {
  try {
    const row = await queryOne(
      `${BASE} WHERE p.public_id = ? ${includeDeleted ? '' : 'AND p.deleted_at IS NULL'} LIMIT 1`,
      [publicId]
    )
    if (row) return mapProduct(row)
  } catch {}
  return memoryStore.getProductByPublicId(publicId)
}

export async function findBySlug(slug) {
  try {
    const row = await queryOne(`${BASE} WHERE p.slug = ? AND p.deleted_at IS NULL LIMIT 1`, [slug])
    if (row) return mapProduct(row)
  } catch {}
  return memoryStore.getProductBySlug(slug)
}

export async function findByInternalId(id, conn = pool) {
  try {
    const [rows] = await conn.query(`${BASE} WHERE p.id = ? LIMIT 1`, [id])
    if (rows && rows[0]) return mapProduct(rows[0])
  } catch {}
  return memoryStore.products.find((p) => p.internalId === id || p.id === id) || null
}

export async function slugExists(slug, ignoreInternalId = null) {
  try {
    const row = ignoreInternalId
      ? await queryOne('SELECT 1 AS x FROM products WHERE slug = ? AND id <> ? LIMIT 1', [slug, ignoreInternalId])
      : await queryOne('SELECT 1 AS x FROM products WHERE slug = ? LIMIT 1', [slug])
    if (row) return Boolean(row)
  } catch {}
  return memoryStore.products.some((p) => p.slug === slug)
}

export async function skuExists(sku, ignoreInternalId = null) {
  try {
    const row = ignoreInternalId
      ? await queryOne('SELECT 1 AS x FROM products WHERE sku = ? AND id <> ? LIMIT 1', [sku, ignoreInternalId])
      : await queryOne('SELECT 1 AS x FROM products WHERE sku = ? LIMIT 1', [sku])
    if (row) return Boolean(row)
  } catch {}
  return memoryStore.products.some((p) => p.sku === sku)
}

export async function findAll(filters = {}) {
  try {
    const {
      limit = 20, offset = 0, categorySlug, categoryPublicId, gender,
      minPrice, maxPrice, size, color, search, status, featured,
      inStockOnly = false, sort = 'newest', storefront = false,
    } = filters

    const where = ['p.deleted_at IS NULL']
    const params = []

    if (storefront) {
      where.push("p.status = 'active'")
    } else if (status) {
      if (Array.isArray(status)) {
        where.push(`p.status IN (${status.map(() => '?').join(',')})`)
        params.push(...status)
      } else {
        where.push('p.status = ?')
        params.push(status)
      }
    }

    if (categorySlug) { where.push('c.slug = ?'); params.push(categorySlug) }
    if (categoryPublicId) { where.push('c.public_id = ?'); params.push(categoryPublicId) }

    if (gender) {
      const list = Array.isArray(gender) ? gender : [gender]
      where.push(`p.gender IN (${list.map(() => '?').join(',')})`)
      params.push(...list)
    }

    if (minPrice !== undefined && minPrice !== null) { where.push('p.price >= ?'); params.push(minPrice) }
    if (maxPrice !== undefined && maxPrice !== null) { where.push('p.price <= ?'); params.push(maxPrice) }
    if (featured !== undefined) { where.push('p.is_featured = ?'); params.push(featured ? 1 : 0) }

    if (search) {
      where.push(`(MATCH(p.name, p.description, p.brand) AGAINST (? IN NATURAL LANGUAGE MODE)
                   OR p.name LIKE ? OR p.sku LIKE ?)`)
      params.push(search, `%${search}%`, `%${search}%`)
    }

    if (size) {
      where.push(`EXISTS (SELECT 1 FROM product_variants v
                          WHERE v.product_id = p.id AND v.size = ?
                            AND v.is_active = TRUE AND (v.stock - v.reserved) > 0)`)
      params.push(size)
    }

    if (color) {
      where.push(`EXISTS (SELECT 1 FROM product_variants v
                          WHERE v.product_id = p.id AND v.color = ? AND v.is_active = TRUE)`)
      params.push(color)
    }

    if (inStockOnly) {
      where.push(`EXISTS (SELECT 1 FROM product_variants v
                          WHERE v.product_id = p.id AND v.is_active = TRUE
                            AND (v.stock - v.reserved) > 0)`)
    }

    const ORDER = {
      newest: 'p.created_at DESC',
      oldest: 'p.created_at ASC',
      price_asc: 'p.price ASC',
      price_desc: 'p.price DESC',
      popular: 'p.units_sold DESC',
      rating: 'p.rating_avg DESC',
      name_asc: 'p.name ASC',
      name_desc: 'p.name DESC',
      stock_asc: 'p.total_stock ASC',
      stock_desc: 'p.total_stock DESC',
    }[sort] ?? 'p.created_at DESC'

    const whereSql = `WHERE ${where.join(' AND ')}`

    const rows = await query(
      `${BASE} ${whereSql} ORDER BY ${ORDER}, p.id DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    )

    if (rows && rows.length > 0) {
      const countRow = await queryOne(
        `SELECT COUNT(*) AS total
         FROM products p LEFT JOIN categories c ON c.id = p.category_id
         ${whereSql}`,
        params
      )
      return { items: rows.map(mapProduct), total: Number(countRow?.total ?? 0) }
    }
  } catch {}

  return memoryStore.getProducts(filters)
}

export async function create(data, conn = pool) {
  const [result] = await conn.query(
    `INSERT INTO products
       (public_id, category_id, name, slug, sku, description, brand, gender,
        material, price, compare_at_price, cost_per_item, status, is_featured,
        images, tags)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      data.publicId, data.categoryInternalId ?? null, data.name, data.slug,
      data.sku, data.description, data.brand, data.gender,
      data.material ?? null, data.price, data.compareAtPrice ?? null,
      data.costPerItem ?? null, data.status, data.featured ? 1 : 0,
      JSON.stringify(data.images ?? []), JSON.stringify(data.tags ?? []),
    ]
  )
  return result.insertId
}

const UPDATABLE = {
  name: 'name',
  slug: 'slug',
  sku: 'sku',
  description: 'description',
  brand: 'brand',
  gender: 'gender',
  material: 'material',
  price: 'price',
  compareAtPrice: 'compare_at_price',
  costPerItem: 'cost_per_item',
  status: 'status',
  featured: 'is_featured',
  categoryInternalId: 'category_id',
}

export async function update(internalId, patch, conn = pool) {
  const sets = []
  const params = []

  for (const [key, column] of Object.entries(UPDATABLE)) {
    if (patch[key] !== undefined) {
      sets.push(`${column} = ?`)
      params.push(typeof patch[key] === 'boolean' ? Number(patch[key]) : patch[key])
    }
  }
  if (patch.images !== undefined) {
    sets.push('images = ?')
    params.push(JSON.stringify(patch.images))
  }
  if (patch.tags !== undefined) {
    sets.push('tags = ?')
    params.push(JSON.stringify(patch.tags))
  }

  if (!sets.length) return
  params.push(internalId)
  await conn.query(`UPDATE products SET ${sets.join(', ')} WHERE id = ?`, params)
}

/** Soft delete — hard-deleting would orphan historical order items. */
export async function softDelete(internalId) {
  const result = await query(
    'UPDATE products SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL',
    [internalId]
  )
  return (result.affectedRows ?? 0) > 0
}

export async function restore(internalId) {
  await query('UPDATE products SET deleted_at = NULL WHERE id = ?', [internalId])
}

export async function bulkSetStatus(internalIds, status) {
  if (!internalIds.length) return 0
  const placeholders = internalIds.map(() => '?').join(',')
  const result = await query(
    `UPDATE products SET status = ? WHERE id IN (${placeholders}) AND deleted_at IS NULL`,
    [status, ...internalIds]
  )
  return result.affectedRows ?? 0
}

export async function bulkSoftDelete(internalIds) {
  if (!internalIds.length) return 0
  const placeholders = internalIds.map(() => '?').join(',')
  const result = await query(
    `UPDATE products SET deleted_at = NOW() WHERE id IN (${placeholders}) AND deleted_at IS NULL`,
    internalIds
  )
  return result.affectedRows ?? 0
}

export async function assignCategory(internalIds, categoryInternalId) {
  if (!internalIds.length) return 0
  const placeholders = internalIds.map(() => '?').join(',')
  const result = await query(
    `UPDATE products SET category_id = ? WHERE id IN (${placeholders}) AND deleted_at IS NULL`,
    [categoryInternalId, ...internalIds]
  )
  return result.affectedRows ?? 0
}

/**
 * Recomputes the cached total_stock and flips status between active and
 * out_of_stock. `draft` and `archived` are never auto-changed.
 */
export async function recalcStock(internalId, conn = pool) {
  await conn.query(
    `UPDATE products p
     SET p.total_stock = (
           SELECT COALESCE(SUM(v.stock), 0)
           FROM product_variants v WHERE v.product_id = p.id
         ),
         p.status = CASE
           WHEN (SELECT COALESCE(SUM(v.stock),0) FROM product_variants v
                  WHERE v.product_id = p.id) = 0 AND p.status = 'active'
             THEN 'out_of_stock'
           WHEN (SELECT COALESCE(SUM(v.stock),0) FROM product_variants v
                  WHERE v.product_id = p.id) > 0 AND p.status = 'out_of_stock'
             THEN 'active'
           ELSE p.status
         END
     WHERE p.id = ?`,
    [internalId]
  )
}

export async function incrementUnitsSold(internalId, quantity, conn = pool) {
  await conn.query('UPDATE products SET units_sold = units_sold + ? WHERE id = ?', [
    quantity, internalId,
  ])
}

export async function findLowStock(threshold, limit = 50) {
  const rows = await query(
    `${BASE}
     WHERE p.deleted_at IS NULL AND p.status <> 'archived' AND p.total_stock <= ?
     ORDER BY p.total_stock ASC LIMIT ?`,
    [threshold, limit]
  )
  return rows.map(mapProduct)
}

export async function findTopSelling(limit = 5) {
  const rows = await query(
    `${BASE} WHERE p.deleted_at IS NULL ORDER BY p.units_sold DESC LIMIT ?`,
    [limit]
  )
  return rows.map(mapProduct)
}

export async function findRelated(categoryInternalId, excludeInternalId, limit = 4) {
  const rows = await query(
    `${BASE}
     WHERE p.deleted_at IS NULL AND p.status = 'active'
       AND p.category_id = ? AND p.id <> ?
     ORDER BY p.units_sold DESC LIMIT ?`,
    [categoryInternalId, excludeInternalId, limit]
  )
  return rows.map(mapProduct)
}

export async function getStats() {
  const row = await queryOne(
    `SELECT COUNT(*) AS total,
            SUM(status = 'active')       AS active,
            SUM(status = 'draft')        AS draft,
            SUM(status = 'archived')     AS archived,
            SUM(total_stock = 0)         AS out_of_stock,
            SUM(price * total_stock)     AS inventory_value
     FROM products WHERE deleted_at IS NULL`
  )
  return {
    total: Number(row?.total ?? 0),
    active: Number(row?.active ?? 0),
    draft: Number(row?.draft ?? 0),
    archived: Number(row?.archived ?? 0),
    outOfStock: Number(row?.out_of_stock ?? 0),
    inventoryValue: decimalToNumber(row?.inventory_value) ?? 0,
  }
}
