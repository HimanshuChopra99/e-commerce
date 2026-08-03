import { pool, query, queryOne, isDatabaseConnected } from '../config/database.js'
import { decimalToNumber } from '../utils/money.js'
import { tierForSpend } from '../utils/constants.js'
import { memoryStore } from '../services/memory-store.js'

/**
 * The database speaks snake_case; the rest of the app speaks camelCase.
 * This file is the only place that boundary is crossed.
 */

// password_hash is deliberately absent — it must never reach a response.
const SAFE_COLUMNS = `
  id, public_id, role, first_name, last_name, email, phone, status,
  email_verified_at, address_line1, address_line2, address_city,
  address_state, address_postal, address_country, preferred_size,
  marketing_opt_in, notes, last_login_at, created_at, updated_at
`

export function mapUser(row) {
  if (!row) return null
  return {
    // `id` in the API is always the ULID; the auto-increment stays internal.
    id: row.public_id,
    publicId: row.public_id,
    internalId: row.id,
    role: row.role,
    firstName: row.first_name,
    lastName: row.last_name,
    fullName: `${row.first_name} ${row.last_name}`.trim(),
    email: row.email,
    phone: row.phone,
    status: row.status,
    emailVerified: Boolean(row.email_verified_at),
    address: row.address_line1
      ? {
          line1: row.address_line1,
          line2: row.address_line2,
          city: row.address_city,
          state: row.address_state,
          postalCode: row.address_postal,
          country: row.address_country,
        }
      : null,
    preferredSize: row.preferred_size,
    marketingOptIn: Boolean(row.marketing_opt_in),
    notes: row.notes ?? null,
    lastLoginAt: row.last_login_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function mapMemoryUser(mem) {
  if (!mem) return null
  return {
    id: mem.publicId || mem.id,
    publicId: mem.publicId || mem.id,
    internalId: mem.internalId || mem.id,
    role: mem.role || 'customer',
    firstName: mem.firstName,
    lastName: mem.lastName,
    fullName: mem.fullName || `${mem.firstName} ${mem.lastName}`.trim(),
    email: mem.email,
    phone: mem.phone || '',
    status: mem.status || 'active',
    emailVerified: mem.emailVerified !== false,
    address: mem.address || null,
    preferredSize: mem.preferredSize || null,
    marketingOptIn: Boolean(mem.marketingOptIn),
    notes: mem.notes || null,
    lastLoginAt: mem.lastLoginAt || null,
    createdAt: mem.createdAt || new Date().toISOString(),
    updatedAt: mem.updatedAt || new Date().toISOString(),
    tier: mem.tier || 'bronze',
    totalOrders: mem.totalOrders ?? 0,
    totalSpent: mem.totalSpent ?? 0,
    avgOrderValue: mem.avgOrderValue ?? 0,
    returnCount: mem.returnCount ?? 0,
    lastOrderAt: mem.lastOrderAt || null,
  }
}

/** Strips admin-only fields before sending to a customer. */
export function toPublicUser(user) {
  if (!user) return null
  const { internalId: _i, notes: _n, ...rest } = user
  return rest
}

export async function findByPublicId(publicId) {
  if (isDatabaseConnected()) {
    try {
      const row = await queryOne(`SELECT ${SAFE_COLUMNS} FROM users WHERE public_id = ? LIMIT 1`, [publicId])
      if (row) return mapUser(row)
    } catch {}
  }
  const mem = memoryStore.getUserByPublicId(publicId)
  return mem ? mapMemoryUser(mem) : null
}

export async function findById(id) {
  if (isDatabaseConnected()) {
    try {
      const row = await queryOne(`SELECT ${SAFE_COLUMNS} FROM users WHERE id = ? LIMIT 1`, [id])
      if (row) return mapUser(row)
    } catch {}
  }
  const mem = memoryStore.getUsers().find((u) => u.internalId === id || u.id === id || u.publicId === id)
  return mem ? mapMemoryUser(mem) : null
}

export async function findByEmail(email) {
  if (isDatabaseConnected()) {
    try {
      const row = await queryOne(`SELECT ${SAFE_COLUMNS} FROM users WHERE email = ? LIMIT 1`, [email])
      if (row) return mapUser(row)
    } catch {}
  }
  const mem = memoryStore.getUserByEmail(email)
  return mem ? mapMemoryUser(mem) : null
}

/** Only for the login path — includes the hash. Never expose the result. */
export async function findByEmailWithHash(email) {
  if (isDatabaseConnected()) {
    try {
      const row = await queryOne(
        `SELECT ${SAFE_COLUMNS}, password_hash FROM users WHERE email = ? LIMIT 1`,
        [email]
      )
      if (row) return { ...mapUser(row), passwordHash: row.password_hash }
    } catch {}
  }
  const mem = memoryStore.getUserByEmail(email)
  return mem ? { ...mapMemoryUser(mem), passwordHash: mem.passwordHash } : null
}

export async function findByIdWithHash(id) {
  if (isDatabaseConnected()) {
    try {
      const row = await queryOne(
        `SELECT ${SAFE_COLUMNS}, password_hash FROM users WHERE id = ? LIMIT 1`,
        [id]
      )
      if (row) return { ...mapUser(row), passwordHash: row.password_hash }
    } catch {}
  }
  const mem = memoryStore.getUsers().find((u) => u.internalId === id || u.id === id || u.publicId === id)
  return mem ? { ...mapMemoryUser(mem), passwordHash: mem.passwordHash } : null
}

export async function emailExists(email) {
  if (isDatabaseConnected()) {
    try {
      const row = await queryOne('SELECT 1 AS x FROM users WHERE email = ? LIMIT 1', [email])
      if (row) return true
    } catch {}
  }
  return Boolean(memoryStore.getUserByEmail(email))
}

export async function create(data, conn = pool) {
  if (isDatabaseConnected()) {
    try {
      const [result] = await conn.query(
        `INSERT INTO users
           (public_id, role, first_name, last_name, email, password_hash, phone,
            marketing_opt_in, preferred_size,
            address_line1, address_line2, address_city, address_state,
            address_postal, address_country)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          data.publicId, data.role ?? 'customer', data.firstName, data.lastName,
          data.email, data.passwordHash, data.phone ?? null,
          data.marketingOptIn ? 1 : 0, data.preferredSize ?? null,
          data.address?.line1 ?? null, data.address?.line2 ?? null,
          data.address?.city ?? null, data.address?.state ?? null,
          data.address?.postalCode ?? null, data.address?.country ?? null,
        ]
      )
      const created = await findById(result.insertId)
      if (created) return created
    } catch {}
  }

  const mem = memoryStore.addUser({
    role: data.role ?? 'customer',
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email,
    passwordHash: data.passwordHash,
    phone: data.phone ?? '',
    marketingOptIn: data.marketingOptIn,
    address: data.address ?? null,
    preferredSize: data.preferredSize ?? '9',
  })
  if (data.publicId) {
    mem.id = data.publicId
    mem.publicId = data.publicId
  }
  return mapMemoryUser(mem)
}

const UPDATABLE = {
  firstName: 'first_name',
  lastName: 'last_name',
  phone: 'phone',
  status: 'status',
  preferredSize: 'preferred_size',
  marketingOptIn: 'marketing_opt_in',
  notes: 'notes',
}

const ADDRESS_FIELDS = {
  line1: 'address_line1',
  line2: 'address_line2',
  city: 'address_city',
  state: 'address_state',
  postalCode: 'address_postal',
  country: 'address_country',
}

/** Whitelisted update — a client cannot set `role` or `password_hash` here. */
export async function update(id, patch) {
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

      if (patch.address !== undefined) {
        for (const [key, column] of Object.entries(ADDRESS_FIELDS)) {
          sets.push(`${column} = ?`)
          params.push(patch.address?.[key] ?? null)
        }
      }

      if (sets.length) {
        params.push(id)
        await query(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`, params)
        const updated = await findById(id)
        if (updated) return updated
      }
    } catch {}
  }

  // Memory store fallback
  const mem = memoryStore.getUsers().find((u) => u.internalId === id || u.id === id || u.publicId === id)
  if (!mem) return null
  if (patch.firstName !== undefined) mem.firstName = patch.firstName
  if (patch.lastName !== undefined) mem.lastName = patch.lastName
  if (patch.firstName || patch.lastName) mem.fullName = `${mem.firstName} ${mem.lastName}`.trim()
  if (patch.phone !== undefined) mem.phone = patch.phone
  if (patch.status !== undefined) mem.status = patch.status
  if (patch.preferredSize !== undefined) mem.preferredSize = patch.preferredSize
  if (patch.marketingOptIn !== undefined) mem.marketingOptIn = Boolean(patch.marketingOptIn)
  if (patch.address !== undefined) mem.address = patch.address
  mem.updatedAt = new Date().toISOString()
  return mapMemoryUser(mem)
}

export async function updatePassword(id, passwordHash) {
  if (isDatabaseConnected()) {
    try {
      await query('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, id])
      return
    } catch {}
  }
  const mem = memoryStore.getUsers().find((u) => u.internalId === id || u.id === id || u.publicId === id)
  if (mem) {
    mem.passwordHash = passwordHash
    mem.updatedAt = new Date().toISOString()
  }
}

export async function markEmailVerified(id) {
  if (isDatabaseConnected()) {
    try {
      await query('UPDATE users SET email_verified_at = NOW() WHERE id = ?', [id])
      return
    } catch {}
  }
  const mem = memoryStore.getUsers().find((u) => u.internalId === id || u.id === id || u.publicId === id)
  if (mem) {
    mem.emailVerified = true
    mem.updatedAt = new Date().toISOString()
  }
}

export async function touchLastLogin(id) {
  if (isDatabaseConnected()) {
    try {
      await query('UPDATE users SET last_login_at = NOW() WHERE id = ?', [id])
      return
    } catch {}
  }
  const mem = memoryStore.getUsers().find((u) => u.internalId === id || u.id === id || u.publicId === id)
  if (mem) {
    mem.lastLoginAt = new Date().toISOString()
  }
}

/**
 * Admin customer list.
 */
export async function listCustomers({
  search, status, tier, sort = 'created_desc', limit = 20, offset = 0,
} = {}) {
  if (isDatabaseConnected()) {
    try {
      const where = ["u.role = 'customer'"]
      const params = []

      if (search) {
        where.push(`(u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ?
                     OR u.phone LIKE ? OR u.address_city LIKE ?
                     OR CONCAT(u.first_name, ' ', u.last_name) LIKE ?)`)
        const like = `%${search}%`
        params.push(like, like, like, like, like, like)
      }
      if (status) {
        where.push('u.status = ?')
        params.push(status)
      }

      const whereSql = `WHERE ${where.join(' AND ')}`

      const STATS = `
        LEFT JOIN (
          SELECT user_id,
                 COUNT(*)         AS order_count,
                 SUM(grand_total) AS total_spent,
                 AVG(grand_total) AS avg_order_value,
                 MAX(placed_at)   AS last_order_at,
                 SUM(status = 'returned') AS return_count
          FROM orders
          WHERE status <> 'cancelled' AND user_id IS NOT NULL
          GROUP BY user_id
        ) o ON o.user_id = u.id
      `

      const havingSql = tier
        ? `HAVING CASE
             WHEN COALESCE(o.total_spent,0) >= 2500 THEN 'platinum'
             WHEN COALESCE(o.total_spent,0) >= 1200 THEN 'gold'
             WHEN COALESCE(o.total_spent,0) >=  500 THEN 'silver'
             ELSE 'bronze' END = ?`
        : ''

      const ORDER = {
        created_desc: 'u.created_at DESC',
        created_asc: 'u.created_at ASC',
        spent_desc: 'total_spent DESC',
        spent_asc: 'total_spent ASC',
        orders_desc: 'total_orders DESC',
        name_asc: 'u.first_name ASC',
      }[sort] ?? 'u.created_at DESC'

      const rows = await query(
        `SELECT ${SAFE_COLUMNS.split(',').map((c) => `u.${c.trim()}`).join(', ')},
                COALESCE(o.order_count, 0)     AS total_orders,
                COALESCE(o.total_spent, 0)     AS total_spent,
                COALESCE(o.avg_order_value, 0) AS avg_order_value,
                COALESCE(o.return_count, 0)    AS return_count,
                o.last_order_at
         FROM users u
         ${STATS}
         ${whereSql}
         ${havingSql}
         ORDER BY ${ORDER}
         LIMIT ? OFFSET ?`,
        tier ? [...params, tier, limit, offset] : [...params, limit, offset]
      )

      const countRows = await query(
        `SELECT COUNT(*) AS total FROM (
           SELECT u.id
           FROM users u ${STATS} ${whereSql} ${havingSql}
         ) t`,
        tier ? [...params, tier] : params
      )

      if (rows && rows.length > 0) {
        return {
          items: rows.map((row) => ({
            ...mapUser(row),
            totalOrders: Number(row.total_orders),
            totalSpent: decimalToNumber(row.total_spent) ?? 0,
            avgOrderValue: decimalToNumber(row.avg_order_value) ?? 0,
            returnCount: Number(row.return_count),
            lastOrderAt: row.last_order_at,
            tier: tierForSpend(decimalToNumber(row.total_spent) ?? 0),
          })),
          total: Number(countRows[0]?.total ?? 0),
        }
      }
    } catch {}
  }

  // Memory store fallback
  let list = memoryStore.getUsers().filter((u) => u.role === 'customer')
  if (search) {
    const q = search.toLowerCase()
    list = list.filter(
      (u) =>
        u.firstName?.toLowerCase().includes(q) ||
        u.lastName?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.phone?.toLowerCase().includes(q)
    )
  }
  if (status) {
    list = list.filter((u) => u.status === status)
  }
  return {
    items: list.slice(offset, offset + limit).map(mapMemoryUser),
    total: list.length,
  }
}

/** Order stats for one customer (detail page). */
export async function getCustomerStats(userId) {
  if (isDatabaseConnected()) {
    try {
      const row = await queryOne(
        `SELECT COUNT(*)         AS order_count,
                SUM(grand_total) AS total_spent,
                AVG(grand_total) AS avg_order_value,
                MAX(placed_at)   AS last_order_at,
                SUM(status = 'returned') AS return_count
         FROM orders
         WHERE user_id = ? AND status <> 'cancelled'`,
        [userId]
      )
      if (row) {
        const totalSpent = decimalToNumber(row?.total_spent) ?? 0
        return {
          totalOrders: Number(row?.order_count ?? 0),
          totalSpent,
          avgOrderValue: decimalToNumber(row?.avg_order_value) ?? 0,
          returnCount: Number(row?.return_count ?? 0),
          lastOrderAt: row?.last_order_at ?? null,
          tier: tierForSpend(totalSpent),
        }
      }
    } catch {}
  }

  const mem = memoryStore.getUsers().find((u) => u.internalId === userId || u.id === userId || u.publicId === userId)
  return {
    totalOrders: mem?.totalOrders ?? 0,
    totalSpent: mem?.totalSpent ?? 0,
    avgOrderValue: mem?.avgOrderValue ?? 0,
    returnCount: mem?.returnCount ?? 0,
    lastOrderAt: mem?.lastOrderAt ?? null,
    tier: mem?.tier || tierForSpend(mem?.totalSpent ?? 0),
  }
}

/** The products a customer buys most — shown on their detail page. */
export async function getFavouriteProducts(userId, limit = 4) {
  if (isDatabaseConnected()) {
    try {
      const rows = await query(
        `SELECT oi.product_id, oi.product_name, oi.product_slug, oi.product_image,
                SUM(oi.quantity) AS units
         FROM order_items oi
         JOIN orders o ON o.id = oi.order_id
         WHERE o.user_id = ? AND o.status <> 'cancelled'
         GROUP BY oi.product_id, oi.product_name, oi.product_slug, oi.product_image
         ORDER BY units DESC
         LIMIT ?`,
        [userId, limit]
      )
      if (rows && rows.length > 0) {
        return rows.map((r) => ({
          productId: r.product_id,
          name: r.product_name,
          slug: r.product_slug,
          image: r.product_image,
          unitsBought: Number(r.units),
        }))
      }
    } catch {}
  }
  return []
}

export async function countNewSince(date) {
  if (isDatabaseConnected()) {
    try {
      const row = await queryOne(
        "SELECT COUNT(*) AS n FROM users WHERE role = 'customer' AND created_at >= ?",
        [date]
      )
      return Number(row?.n ?? 0)
    } catch {}
  }
  return memoryStore.getUsers().filter((u) => u.role === 'customer' && new Date(u.createdAt) >= new Date(date)).length
}

export async function countBetween(from, to) {
  if (isDatabaseConnected()) {
    try {
      const row = await queryOne(
        "SELECT COUNT(*) AS n FROM users WHERE role = 'customer' AND created_at >= ? AND created_at < ?",
        [from, to]
      )
      return Number(row?.n ?? 0)
    } catch {}
  }
  return memoryStore.getUsers().filter(
    (u) => u.role === 'customer' && new Date(u.createdAt) >= new Date(from) && new Date(u.createdAt) < new Date(to)
  ).length
}

export async function countAll() {
  if (isDatabaseConnected()) {
    try {
      const row = await queryOne("SELECT COUNT(*) AS n FROM users WHERE role = 'customer'")
      return Number(row?.n ?? 0)
    } catch {}
  }
  return memoryStore.getUsers().filter((u) => u.role === 'customer').length
}
