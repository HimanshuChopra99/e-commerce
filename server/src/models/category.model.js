import { pool, query, queryOne, isDatabaseConnected } from '../config/database.js'
import { memoryStore } from '../services/memory-store.js'

export function mapCategory(row) {
  if (!row) return null
  return {
    id: row.public_id,
    publicId: row.public_id,
    internalId: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    color: row.color,
    image: row.image_url,
    isActive: Boolean(row.is_active),
    sortOrder: row.sort_order,
    productCount: row.product_count !== undefined ? Number(row.product_count) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/** Never leak the internal auto-increment id to a client. */
export function toPublicCategory(category) {
  if (!category) return null
  const { internalId: _i, ...rest } = category
  return rest
}

const WITH_COUNT = `
  SELECT c.*,
         (SELECT COUNT(*) FROM products p
           WHERE p.category_id = c.id AND p.deleted_at IS NULL) AS product_count
  FROM categories c
`

export async function findAll({ activeOnly = false } = {}) {
  if (isDatabaseConnected()) {
    try {
      const rows = await query(
        `${WITH_COUNT}
         ${activeOnly ? 'WHERE c.is_active = TRUE' : ''}
         ORDER BY c.sort_order ASC, c.name ASC`
      )
      if (rows && rows.length > 0) return rows.map(mapCategory)
    } catch {}
  }
  return memoryStore.getCategories().filter((c) => (activeOnly ? c.isActive !== false : true))
}

export async function findByPublicId(publicId) {
  if (isDatabaseConnected()) {
    try {
      const row = await queryOne(`${WITH_COUNT} WHERE c.public_id = ? LIMIT 1`, [publicId])
      if (row) return mapCategory(row)
    } catch {}
  }
  return memoryStore.getCategoryByPublicId(publicId)
}

export async function findBySlug(slug) {
  if (isDatabaseConnected()) {
    try {
      const row = await queryOne(`${WITH_COUNT} WHERE c.slug = ? LIMIT 1`, [slug])
      if (row) return mapCategory(row)
    } catch {}
  }
  return memoryStore.getCategoryBySlug(slug)
}

export async function slugExists(slug, ignoreInternalId = null) {
  if (isDatabaseConnected()) {
    try {
      const row = ignoreInternalId
        ? await queryOne('SELECT 1 AS x FROM categories WHERE slug = ? AND id <> ? LIMIT 1', [slug, ignoreInternalId])
        : await queryOne('SELECT 1 AS x FROM categories WHERE slug = ? LIMIT 1', [slug])
      if (row) return Boolean(row)
    } catch {}
  }
  return memoryStore.categories.some((c) => c.slug === slug)
}

export async function create(data, conn = pool) {
  if (isDatabaseConnected()) {
    try {
      const [result] = await conn.query(
        `INSERT INTO categories (public_id, name, slug, description, color, image_url, sort_order)
         VALUES (?,?,?,?,?,?,?)`,
        [data.publicId, data.name, data.slug, data.description ?? null,
         data.color ?? 'slate', data.image ?? null, data.sortOrder ?? 0]
      )
      const row = await queryOne(`${WITH_COUNT} WHERE c.id = ?`, [result.insertId])
      if (row) return mapCategory(row)
    } catch {}
  }
  return memoryStore.addCategory(data)
}

const UPDATABLE = {
  name: 'name',
  slug: 'slug',
  description: 'description',
  color: 'color',
  image: 'image_url',
  isActive: 'is_active',
  sortOrder: 'sort_order',
}

export async function update(internalId, patch) {
  if (isDatabaseConnected()) {
    try {
      const sets = []
      const params = []
      for (const [key, column] of Object.entries(UPDATABLE)) {
        if (patch[key] !== undefined) {
          sets.push(`${column} = ?`)
          params.push(typeof patch[key] === 'boolean' ? Number(patch[key]) : patch[key])
        }
      }
      if (!sets.length) {
        return mapCategory(await queryOne(`${WITH_COUNT} WHERE c.id = ?`, [internalId]))
      }
      params.push(internalId)
      await query(`UPDATE categories SET ${sets.join(', ')} WHERE id = ?`, params)
      const updated = await queryOne(`${WITH_COUNT} WHERE c.id = ?`, [internalId])
      if (updated) return mapCategory(updated)
    } catch {}
  }

  // Memory store fallback
  const cat = memoryStore.categories.find(
    (c) => c.internalId === internalId || c.id === internalId || c.publicId === internalId
  )
  if (!cat) return null
  Object.assign(cat, patch, { updatedAt: new Date().toISOString() })
  return cat
}

/** Products fall back to uncategorised via ON DELETE SET NULL. */
export async function remove(internalId) {
  if (isDatabaseConnected()) {
    try {
      const result = await query('DELETE FROM categories WHERE id = ?', [internalId])
      return (result.affectedRows ?? 0) > 0
    } catch {}
  }
  return memoryStore.deleteCategory(internalId)
}

export async function countAll() {
  if (isDatabaseConnected()) {
    try {
      const row = await queryOne('SELECT COUNT(*) AS n FROM categories')
      return Number(row?.n ?? 0)
    } catch {}
  }
  return memoryStore.categories.length
}
