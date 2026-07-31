import { pool, query, queryOne } from '../config/database.js'
import { decimalToNumber } from '../utils/money.js'
import { tierForSpend } from '../utils/constants.js'

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

/** Strips admin-only fields before sending to a customer. */
export function toPublicUser(user) {
  if (!user) return null
  const { internalId: _i, notes: _n, ...rest } = user
  return rest
}

export async function findByPublicId(publicId) {
  return mapUser(
    await queryOne(`SELECT ${SAFE_COLUMNS} FROM users WHERE public_id = ? LIMIT 1`, [publicId])
  )
}

export async function findById(id) {
  return mapUser(
    await queryOne(`SELECT ${SAFE_COLUMNS} FROM users WHERE id = ? LIMIT 1`, [id])
  )
}

export async function findByEmail(email) {
  return mapUser(
    await queryOne(`SELECT ${SAFE_COLUMNS} FROM users WHERE email = ? LIMIT 1`, [email])
  )
}

/** Only for the login path — includes the hash. Never expose the result. */
export async function findByEmailWithHash(email) {
  const row = await queryOne(
    `SELECT ${SAFE_COLUMNS}, password_hash FROM users WHERE email = ? LIMIT 1`,
    [email]
  )
  if (!row) return null
  return { ...mapUser(row), passwordHash: row.password_hash }
}

export async function findByIdWithHash(id) {
  const row = await queryOne(
    `SELECT ${SAFE_COLUMNS}, password_hash FROM users WHERE id = ? LIMIT 1`,
    [id]
  )
  if (!row) return null
  return { ...mapUser(row), passwordHash: row.password_hash }
}

export async function emailExists(email) {
  const row = await queryOne('SELECT 1 AS x FROM users WHERE email = ? LIMIT 1', [email])
  return Boolean(row)
}

export async function create(data, conn = pool) {
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
  return findById(result.insertId)
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

  if (!sets.length) return findById(id)

  params.push(id)
  await query(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`, params)
  return findById(id)
}

export async function updatePassword(id, passwordHash) {
  await query('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, id])
}

export async function markEmailVerified(id) {
  await query('UPDATE users SET email_verified_at = NOW() WHERE id = ?', [id])
}

export async function touchLastLogin(id) {
  await query('UPDATE users SET last_login_at = NOW() WHERE id = ?', [id])
}

/**
 * Admin customer list.
 *
 * Order stats are aggregated in a subquery and the loyalty tier is DERIVED, not
 * stored — a stored tier would silently drift the moment an order is refunded.
 */
export async function listCustomers({
  search, status, tier, sort = 'created_desc', limit = 20, offset = 0,
}) {
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

  // Tier filtering has to happen after the aggregate, so it goes in HAVING.
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

/** Order stats for one customer (detail page). */
export async function getCustomerStats(userId) {
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

/** The products a customer buys most — shown on their detail page. */
export async function getFavouriteProducts(userId, limit = 4) {
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
  return rows.map((r) => ({
    productId: r.product_id,
    name: r.product_name,
    slug: r.product_slug,
    image: r.product_image,
    unitsBought: Number(r.units),
  }))
}

export async function countNewSince(date) {
  const row = await queryOne(
    "SELECT COUNT(*) AS n FROM users WHERE role = 'customer' AND created_at >= ?",
    [date]
  )
  return Number(row?.n ?? 0)
}

export async function countBetween(from, to) {
  const row = await queryOne(
    "SELECT COUNT(*) AS n FROM users WHERE role = 'customer' AND created_at >= ? AND created_at < ?",
    [from, to]
  )
  return Number(row?.n ?? 0)
}

export async function countAll() {
  const row = await queryOne("SELECT COUNT(*) AS n FROM users WHERE role = 'customer'")
  return Number(row?.n ?? 0)
}
