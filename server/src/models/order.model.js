import { pool, query, queryOne } from '../config/database.js'
import { decimalToNumber } from '../utils/money.js'

export function mapOrder(row) {
  if (!row) return null
  return {
    id: row.public_id,
    internalId: row.id,
    orderNumber: row.order_number,
    customerId: row.user_public_id ?? null,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    customerPhone: row.customer_phone,
    status: row.status,
    paymentStatus: row.payment_status,
    paymentMethod: row.payment_method,
    subtotal: decimalToNumber(row.subtotal),
    shipping: decimalToNumber(row.shipping_total),
    tax: decimalToNumber(row.tax_total),
    total: decimalToNumber(row.grand_total),
    refundedAmount: decimalToNumber(row.refunded_amount),
    currency: row.currency,
    itemCount: row.item_count !== undefined ? Number(row.item_count) : undefined,
    shippingAddress: {
      name: row.shipping_name,
      phone: row.shipping_phone,
      line1: row.shipping_line1,
      line2: row.shipping_line2,
      city: row.shipping_city,
      state: row.shipping_state,
      postalCode: row.shipping_postal,
      country: row.shipping_country,
    },
    courier: row.courier,
    trackingNumber: row.tracking_number,
    customerNote: row.customer_note,
    adminNote: row.admin_note,
    placedAt: row.placed_at,
    paidAt: row.paid_at,
    shippedAt: row.shipped_at,
    deliveredAt: row.delivered_at,
    cancelledAt: row.cancelled_at,
    updatedAt: row.updated_at,
  }
}

/** Hides internal ids and staff-only notes from the customer. */
export function toPublicOrder(order) {
  if (!order) return null
  const { internalId: _i, adminNote: _a, ...rest } = order
  return rest
}

export function mapOrderItem(row) {
  return {
    id: row.id,
    productId: row.product_id,
    variantId: row.variant_id,
    name: row.product_name,
    slug: row.product_slug,
    sku: row.product_sku,
    image: row.product_image,
    size: row.size,
    color: row.color,
    unitPrice: decimalToNumber(row.unit_price),
    quantity: Number(row.quantity),
    lineTotal: decimalToNumber(row.line_total),
  }
}

const BASE = `
  SELECT o.*, u.public_id AS user_public_id,
         (SELECT COALESCE(SUM(oi.quantity), 0)
            FROM order_items oi WHERE oi.order_id = o.id) AS item_count
  FROM orders o
  LEFT JOIN users u ON u.id = o.user_id
`

export async function findByPublicId(publicId) {
  return mapOrder(await queryOne(`${BASE} WHERE o.public_id = ? LIMIT 1`, [publicId]))
}

/** Reads an order through a given connection (used inside a transaction). */
export async function findByInternalId(id, conn = pool) {
  const [rows] = await conn.query(`${BASE} WHERE o.id = ? LIMIT 1`, [id])
  return mapOrder(rows[0])
}

export async function findByOrderNumber(orderNumber) {
  return mapOrder(await queryOne(`${BASE} WHERE o.order_number = ? LIMIT 1`, [orderNumber]))
}

export async function findByPaymentIntent(intentId, conn = pool) {
  const [rows] = await conn.query(`${BASE} WHERE o.stripe_payment_intent_id = ? LIMIT 1`, [intentId])
  return mapOrder(rows[0])
}

/** Locks an order row so two webhooks can't fulfil it concurrently. */
export async function findByPaymentIntentForUpdate(intentId, conn) {
  const [rows] = await conn.query(
    'SELECT * FROM orders WHERE stripe_payment_intent_id = ? FOR UPDATE',
    [intentId]
  )
  return rows[0] ?? null
}

export async function findItems(orderInternalId, conn = pool) {
  const [rows] = await conn.query(
    'SELECT * FROM order_items WHERE order_id = ? ORDER BY id',
    [orderInternalId]
  )
  return rows.map(mapOrderItem)
}

/** Raw rows (snake_case) — used inside the webhook transaction. */
export async function findRawItems(orderInternalId, conn = pool) {
  const [rows] = await conn.query(
    'SELECT * FROM order_items WHERE order_id = ?',
    [orderInternalId]
  )
  return rows
}

export async function findAll(filters = {}) {
  const {
    limit = 20, offset = 0, userId, status, paymentStatus, paymentMethod,
    search, dateFrom, dateTo, minTotal, maxTotal, sort = 'newest',
  } = filters

  const where = []
  const params = []

  if (userId) { where.push('o.user_id = ?'); params.push(userId) }

  for (const [column, value] of [
    ['o.status', status],
    ['o.payment_status', paymentStatus],
    ['o.payment_method', paymentMethod],
  ]) {
    if (!value) continue
    const list = Array.isArray(value) ? value : [value]
    if (!list.length) continue
    where.push(`${column} IN (${list.map(() => '?').join(',')})`)
    params.push(...list)
  }

  if (search) {
    where.push(`(o.order_number LIKE ? OR o.customer_name LIKE ?
                 OR o.customer_email LIKE ? OR o.tracking_number LIKE ?)`)
    const like = `%${search}%`
    params.push(like, like, like, like)
  }

  if (dateFrom) { where.push('o.placed_at >= ?'); params.push(dateFrom) }
  if (dateTo) { where.push('o.placed_at <= ?'); params.push(dateTo) }
  if (minTotal !== undefined) { where.push('o.grand_total >= ?'); params.push(minTotal) }
  if (maxTotal !== undefined) { where.push('o.grand_total <= ?'); params.push(maxTotal) }

  const ORDER = {
    newest: 'o.placed_at DESC',
    oldest: 'o.placed_at ASC',
    total_desc: 'o.grand_total DESC',
    total_asc: 'o.grand_total ASC',
  }[sort] ?? 'o.placed_at DESC'

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''

  const rows = await query(
    `${BASE} ${whereSql} ORDER BY ${ORDER}, o.id DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  )
  const countRow = await queryOne(
    `SELECT COUNT(*) AS total FROM orders o ${whereSql}`,
    params
  )

  return { items: rows.map(mapOrder), total: Number(countRow?.total ?? 0) }
}

/**
 * Generates the next human-facing order number inside the caller's
 * transaction, so two concurrent checkouts can't produce the same one.
 */
export async function nextOrderNumber(conn) {
  const [rows] = await conn.query(
    `SELECT COALESCE(MAX(CAST(SUBSTRING(order_number, 2) AS UNSIGNED)), 1000) AS last
     FROM orders
     WHERE order_number REGEXP '^#[0-9]+$'
     FOR UPDATE`
  )
  return `#${Number(rows[0]?.last ?? 1000) + 1}`
}

export async function create(data, conn) {
  const [result] = await conn.query(
    `INSERT INTO orders
       (public_id, order_number, user_id, customer_email, customer_name,
        customer_phone, status, payment_status, payment_method,
        subtotal, shipping_total, tax_total, grand_total, currency,
        shipping_name, shipping_phone, shipping_line1, shipping_line2,
        shipping_city, shipping_state, shipping_postal, shipping_country,
        customer_note)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      data.publicId, data.orderNumber, data.userId ?? null,
      data.customerEmail, data.customerName, data.customerPhone ?? null,
      'pending', data.paymentStatus ?? 'pending', data.paymentMethod,
      data.subtotal, data.shipping, data.tax, data.total, data.currency,
      data.shippingAddress.name, data.shippingAddress.phone ?? null,
      data.shippingAddress.line1, data.shippingAddress.line2 ?? null,
      data.shippingAddress.city, data.shippingAddress.state,
      data.shippingAddress.postalCode, data.shippingAddress.country,
      data.customerNote ?? null,
    ]
  )
  return result.insertId
}

export async function addItem(orderInternalId, item, conn) {
  await conn.query(
    `INSERT INTO order_items
       (order_id, product_id, variant_id, product_name, product_slug,
        product_sku, product_image, size, color, unit_price, quantity, line_total)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      orderInternalId, item.productId, item.variantId, item.name, item.slug,
      item.sku, item.image, item.size, item.color,
      item.unitPrice, item.quantity, item.lineTotal,
    ]
  )
}

export async function setPaymentIntent(orderInternalId, intentId, conn = pool) {
  await conn.query('UPDATE orders SET stripe_payment_intent_id = ? WHERE id = ?', [
    intentId, orderInternalId,
  ])
}

const STATUS_TIMESTAMP = {
  shipped: 'shipped_at',
  delivered: 'delivered_at',
  cancelled: 'cancelled_at',
}

export async function updateStatus(orderInternalId, status, extra = {}, conn = pool) {
  const sets = ['status = ?']
  const params = [status]

  const stamp = STATUS_TIMESTAMP[status]
  if (stamp) sets.push(`${stamp} = NOW()`)

  if (extra.courier !== undefined) { sets.push('courier = ?'); params.push(extra.courier) }
  if (extra.trackingNumber !== undefined) {
    sets.push('tracking_number = ?')
    params.push(extra.trackingNumber)
  }
  if (extra.adminNote !== undefined) { sets.push('admin_note = ?'); params.push(extra.adminNote) }

  params.push(orderInternalId)
  await conn.query(`UPDATE orders SET ${sets.join(', ')} WHERE id = ?`, params)
}

export async function markPaid(orderInternalId, chargeId, conn) {
  await conn.query(
    `UPDATE orders
     SET payment_status = 'paid', status = 'processing',
         paid_at = NOW(), stripe_charge_id = ?
     WHERE id = ?`,
    [chargeId ?? null, orderInternalId]
  )
}

export async function markPaymentFailed(orderInternalId, conn = pool) {
  await conn.query(
    "UPDATE orders SET payment_status = 'failed' WHERE id = ?",
    [orderInternalId]
  )
}

export async function recordRefund(orderInternalId, amount, fullyRefunded, conn = pool) {
  await conn.query(
    `UPDATE orders
     SET refunded_amount = ?,
         payment_status = ?
     WHERE id = ?`,
    [amount, fullyRefunded ? 'refunded' : 'paid', orderInternalId]
  )
}

export async function updateNote(orderInternalId, adminNote) {
  await query('UPDATE orders SET admin_note = ? WHERE id = ?', [adminNote, orderInternalId])
}

/** Orders stuck unpaid past the reservation window — the cleanup job uses this. */
export async function findStalePending(minutes) {
  const rows = await query(
    `SELECT id, public_id, order_number FROM orders
     WHERE status = 'pending' AND payment_status = 'pending'
       AND placed_at < DATE_SUB(NOW(), INTERVAL ? MINUTE)
     LIMIT 200`,
    [minutes]
  )
  return rows
}

/* ------------------------- Dashboard aggregates ------------------------- */

export async function getStatusCounts() {
  const rows = await query('SELECT status, COUNT(*) AS n FROM orders GROUP BY status')
  const counts = {
    pending: 0, processing: 0, shipped: 0,
    delivered: 0, cancelled: 0, returned: 0,
  }
  for (const row of rows) counts[row.status] = Number(row.n)
  return counts
}

export async function getRevenueStats() {
  const row = await queryOne(
    `SELECT
       COUNT(*)                                        AS total_orders,
       COALESCE(SUM(grand_total), 0)                   AS total_revenue,
       COALESCE(AVG(grand_total), 0)                   AS avg_order_value,
       COALESCE(SUM(CASE WHEN placed_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                         THEN grand_total ELSE 0 END), 0) AS revenue_30,
       COALESCE(SUM(CASE WHEN placed_at >= DATE_SUB(NOW(), INTERVAL 60 DAY)
                          AND placed_at <  DATE_SUB(NOW(), INTERVAL 30 DAY)
                         THEN grand_total ELSE 0 END), 0) AS revenue_prev_30,
       COUNT(CASE WHEN placed_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) AS orders_30,
       COUNT(CASE WHEN placed_at >= DATE_SUB(NOW(), INTERVAL 60 DAY)
                   AND placed_at <  DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) AS orders_prev_30,
       COALESCE(SUM(CASE WHEN placed_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                         THEN grand_total END) /
                NULLIF(COUNT(CASE WHEN placed_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                                  THEN 1 END), 0), 0) AS aov_30,
       COALESCE(SUM(CASE WHEN placed_at >= DATE_SUB(NOW(), INTERVAL 60 DAY)
                          AND placed_at <  DATE_SUB(NOW(), INTERVAL 30 DAY)
                         THEN grand_total END) /
                NULLIF(COUNT(CASE WHEN placed_at >= DATE_SUB(NOW(), INTERVAL 60 DAY)
                                   AND placed_at <  DATE_SUB(NOW(), INTERVAL 30 DAY)
                                  THEN 1 END), 0), 0) AS aov_prev_30,
       COALESCE(SUM((SELECT SUM(oi.quantity) FROM order_items oi
                      WHERE oi.order_id = orders.id)), 0) AS units_sold
     FROM orders
     WHERE status <> 'cancelled'`
  )
  return {
    totalOrders: Number(row?.total_orders ?? 0),
    totalRevenue: decimalToNumber(row?.total_revenue) ?? 0,
    avgOrderValue: decimalToNumber(row?.avg_order_value) ?? 0,
    revenue30: decimalToNumber(row?.revenue_30) ?? 0,
    revenuePrev30: decimalToNumber(row?.revenue_prev_30) ?? 0,
    orders30: Number(row?.orders_30 ?? 0),
    ordersPrev30: Number(row?.orders_prev_30 ?? 0),
    aov30: decimalToNumber(row?.aov_30) ?? 0,
    aovPrev30: decimalToNumber(row?.aov_prev_30) ?? 0,
    unitsSold: Number(row?.units_sold ?? 0),
  }
}

export async function getMonthlyRevenue(months = 12) {
  const rows = await query(
    `SELECT DATE_FORMAT(placed_at, '%Y-%m') AS month,
            SUM(grand_total) AS revenue,
            COUNT(*)         AS orders
     FROM orders
     WHERE status <> 'cancelled'
       AND placed_at >= DATE_SUB(DATE_FORMAT(CURDATE(), '%Y-%m-01'), INTERVAL ? MONTH)
     GROUP BY month ORDER BY month`,
    [months - 1]
  )
  return rows.map((r) => ({
    month: r.month,
    revenue: decimalToNumber(r.revenue) ?? 0,
    orders: Number(r.orders),
  }))
}

export async function getDailyRevenue(days = 7) {
  const rows = await query(
    `SELECT DATE(placed_at) AS day,
            SUM(grand_total) AS revenue,
            COUNT(*)         AS orders
     FROM orders
     WHERE status <> 'cancelled' AND placed_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
     GROUP BY day ORDER BY day`,
    [days - 1]
  )
  return rows.map((r) => ({
    day: r.day,
    revenue: decimalToNumber(r.revenue) ?? 0,
    orders: Number(r.orders),
  }))
}

export async function getRevenueByCategory() {
  const rows = await query(
    `SELECT c.name,
            SUM(oi.line_total) AS revenue,
            SUM(oi.quantity)   AS units
     FROM order_items oi
     JOIN orders o     ON o.id = oi.order_id AND o.status <> 'cancelled'
     JOIN products p   ON p.id = oi.product_id
     JOIN categories c ON c.id = p.category_id
     GROUP BY c.id, c.name
     ORDER BY revenue DESC`
  )
  return rows.map((r) => ({
    name: r.name,
    revenue: decimalToNumber(r.revenue) ?? 0,
    units: Number(r.units),
  }))
}

export async function getSalesBySize() {
  const rows = await query(
    `SELECT oi.size, SUM(oi.quantity) AS units
     FROM order_items oi
     JOIN orders o ON o.id = oi.order_id AND o.status <> 'cancelled'
     GROUP BY oi.size
     ORDER BY CAST(oi.size AS UNSIGNED)`
  )
  return rows.map((r) => ({ size: r.size, units: Number(r.units) }))
}

export async function getRecentOrders(limit = 6) {
  const rows = await query(`${BASE} ORDER BY o.placed_at DESC LIMIT ?`, [limit])
  return rows.map(mapOrder)
}

/** Orders that contain a given product — shown on the product detail page. */
export async function findByProduct(productInternalId, limit = 8) {
  const rows = await query(
    `${BASE}
     WHERE EXISTS (SELECT 1 FROM order_items oi
                   WHERE oi.order_id = o.id AND oi.product_id = ?)
     ORDER BY o.placed_at DESC LIMIT ?`,
    [productInternalId, limit]
  )
  return rows.map(mapOrder)
}

export async function getProductSalesStats(productInternalId) {
  const row = await queryOne(
    `SELECT COALESCE(SUM(oi.quantity), 0)   AS units,
            COALESCE(SUM(oi.line_total), 0) AS revenue
     FROM order_items oi
     JOIN orders o ON o.id = oi.order_id AND o.status <> 'cancelled'
     WHERE oi.product_id = ?`,
    [productInternalId]
  )
  return {
    unitsSold: Number(row?.units ?? 0),
    revenue: decimalToNumber(row?.revenue) ?? 0,
  }
}
