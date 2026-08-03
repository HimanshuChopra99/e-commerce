import { withTransaction, pool } from '../config/database.js'
import { env } from '../config/env.js'
import { logger } from '../config/logger.js'
import { ApiError } from '../utils/api-error.js'
import { publicId, parseJson, randomToken } from '../utils/helpers.js'
import { toCents, fromCents, centsToNumber } from '../utils/money.js'
import { ORDER_TRANSITIONS } from '../utils/constants.js'
import * as orderModel from '../models/order.model.js'
import * as variantModel from '../models/variant.model.js'
import * as productModel from '../models/product.model.js'
import * as userModel from '../models/user.model.js'

/**
 * Prices the cart WITHOUT creating an order.
 *
 * The storefront calls this to show a live total. Every figure is computed
 * from the database, so the preview always matches what checkout will charge.
 */
export async function quote(items) {
  const ids = [...new Set(items.map((i) => i.variantId))]
  if (!ids.length) throw ApiError.badRequest('Your cart is empty.')

  const placeholders = ids.map(() => '?').join(',')
  const [rows] = await pool.query(
    `SELECT v.public_id, v.size, v.color, v.stock, v.reserved, v.is_active,
            p.name, p.slug, p.price, p.status, p.images, p.deleted_at
     FROM product_variants v
     JOIN products p ON p.id = v.product_id
     WHERE v.public_id IN (${placeholders})`,
    ids
  )

  const byId = new Map(rows.map((r) => [r.public_id, r]))
  const lines = []
  let subtotalCents = 0

  for (const item of items) {
    const row = byId.get(item.variantId)
    if (!row || row.deleted_at || row.status !== 'active' || !row.is_active) {
      lines.push({ variantId: item.variantId, available: false, reason: 'unavailable' })
      continue
    }

    const available = Number(row.stock) - Number(row.reserved)
    const quantity = Math.min(item.quantity, env.business.maxQtyPerLine)
    const unitCents = toCents(row.price)
    const lineCents = unitCents * quantity
    subtotalCents += lineCents

    lines.push({
      variantId: item.variantId,
      name: row.name,
      slug: row.slug,
      image: parseJson(row.images, [])[0] ?? null,
      size: row.size,
      color: row.color,
      unitPrice: centsToNumber(unitCents),
      quantity,
      lineTotal: centsToNumber(lineCents),
      available: available >= quantity,
      availableQty: available,
    })
  }

  const totals = calculateTotals(subtotalCents)
  return { lines, ...totals, currency: env.currency }
}

/** Shipping and tax rules live in one place so quote and checkout agree. */
function calculateTotals(subtotalCents) {
  const shippingCents =
    subtotalCents >= toCents(env.business.freeShippingThreshold) || subtotalCents === 0
      ? 0
      : toCents(env.business.flatShippingRate)
  const taxCents = Math.round(subtotalCents * env.business.taxRate)
  const totalCents = subtotalCents + shippingCents + taxCents

  return {
    subtotal: centsToNumber(subtotalCents),
    shipping: centsToNumber(shippingCents),
    tax: centsToNumber(taxCents),
    total: centsToNumber(totalCents),
    subtotalCents,
    shippingCents,
    taxCents,
    totalCents,
  }
}

/**
 * Creates an order from the client's cart.
 *
 * The client sends variant ids and quantities only. Prices, shipping and tax
 * are all recalculated here from the database — a tampered cart cannot change
 * what the customer is charged.
 *
 * Stock is RESERVED (not deducted) inside a transaction that locks the variant
 * rows with FOR UPDATE. That lock is what prevents two shoppers from buying
 * the same last pair.
 */
export async function createOrder({ user, input }) {
  if (!input.items?.length) throw ApiError.badRequest('Your cart is empty.')

  // Collapse duplicate lines so the same variant can't be locked twice.
  const merged = new Map()
  for (const item of input.items) {
    const qty = merged.get(item.variantId) ?? 0
    merged.set(item.variantId, Math.min(qty + item.quantity, env.business.maxQtyPerLine))
  }

  const variantIds = [...merged.keys()]
  const customerEmail = (user?.email ?? input.email ?? '').toLowerCase()
  if (!customerEmail) {
    throw ApiError.badRequest('An email address is required to place an order.')
  }

  return withTransaction(async (conn) => {
    // ── 1. Lock the variants. Other checkouts block here. ──────────────
    const rows = await variantModel.lockForUpdate(variantIds, conn)

    if (rows.length !== variantIds.length) {
      throw ApiError.badRequest('One of the items in your cart no longer exists.')
    }

    // ── 2. Verify every line is buyable ────────────────────────────────
    for (const row of rows) {
      const wanted = merged.get(row.public_id)

      if (row.deleted_at || row.product_status !== 'active' || !row.is_active) {
        throw ApiError.conflict(`"${row.product_name}" is no longer available.`)
      }

      const available = Number(row.stock) - Number(row.reserved)
      if (available < wanted) {
        throw ApiError.insufficientStock(
          available === 0
            ? `"${row.product_name}" in size ${row.size} just sold out.`
            : `Only ${available} left of "${row.product_name}" in size ${row.size}.`,
          [{ variantId: row.public_id, requested: wanted, available }]
        )
      }
    }

    // ── 3. Recalculate money FROM THE DATABASE ─────────────────────────
    let subtotalCents = 0
    const lines = rows.map((row) => {
      const quantity = merged.get(row.public_id)
      const unitCents = toCents(row.price)
      const lineCents = unitCents * quantity
      subtotalCents += lineCents
      return { row, quantity, unitCents, lineCents }
    })

    const totals = calculateTotals(subtotalCents)

    // ── 4. Create the order ────────────────────────────────────────────
    const orderNumber = await orderModel.nextOrderNumber(conn)
    const shipping = input.shippingAddress

    const orderInternalId = await orderModel.create(
      {
        publicId: publicId(),
        orderNumber,
        userId: user?.id ?? null,
        customerEmail,
        customerName: input.customerName
          ?? (user ? `${user.firstName} ${user.lastName}` : shipping.name),
        customerPhone: input.customerPhone ?? shipping.phone ?? null,
        // Cash on delivery is never "paid" up front.
        paymentStatus: 'pending',
        paymentMethod: input.paymentMethod,
        subtotal: fromCents(totals.subtotalCents),
        shipping: fromCents(totals.shippingCents),
        tax: fromCents(totals.taxCents),
        total: fromCents(totals.totalCents),
        currency: env.currency,
        shippingAddress: shipping,
        customerNote: input.customerNote ?? null,
      },
      conn
    )

    // ── 5. Snapshot each line and reserve its stock ────────────────────
    for (const line of lines) {
      await orderModel.addItem(
        orderInternalId,
        {
          productId: line.row.product_id,
          variantId: line.row.id,
          name: line.row.product_name,
          slug: line.row.product_slug,
          sku: line.row.sku,
          image: parseJson(line.row.images, [])[0] ?? null,
          size: line.row.size,
          color: line.row.color,
          unitPrice: fromCents(line.unitCents),
          quantity: line.quantity,
          lineTotal: fromCents(line.lineCents),
        },
        conn
      )

      const reserved = await variantModel.reserve(line.row.id, line.quantity, conn)
      if (!reserved) {
        // Belt and braces: the CHECK constraint would also catch this.
        throw ApiError.insufficientStock(
          `"${line.row.product_name}" in size ${line.row.size} just sold out.`
        )
      }
    }

    // Read the finished order back through the SAME connection, so we see
    // our own uncommitted rows.
    const order = await orderModel.findByInternalId(orderInternalId, conn)

    logger.info(
      { orderNumber, total: totals.total, items: lines.length, userId: user?.publicId },
      'order created'
    )

    return { order, internalId: orderInternalId, totalCents: totals.totalCents }
  })
}

/** Full order detail, with an ownership check for customers. */
export async function getOrder(orderPublicId, requester) {
  const order = await orderModel.findByPublicId(orderPublicId)
  if (!order) throw ApiError.notFound('Order not found.')

  const isAdmin = requester?.role === 'admin'
  const owns = order.customerId && requester?.publicId === order.customerId

  // 404 rather than 403 — don't confirm that someone else's order exists.
  if (!isAdmin && !owns) throw ApiError.notFound('Order not found.')

  const items = await orderModel.findItems(order.internalId)
  const full = { ...order, items }
  return isAdmin ? { ...full, internalId: undefined } : orderModel.toPublicOrder(full)
}

export async function listForUser(userId, { limit, offset }) {
  const { items, total } = await orderModel.findAll({ userId, limit, offset })
  return { items: items.map(orderModel.toPublicOrder), total }
}

export async function listForAdmin(filters) {
  const { items, total } = await orderModel.findAll(filters)
  return { items: items.map(({ internalId: _i, ...o }) => o), total }
}

/**
 * Moves an order through its lifecycle, rejecting impossible jumps.
 * Cancelling or returning puts stock back.
 */
export async function updateStatus(orderPublicId, nextStatus, extra = {}) {
  const order = await orderModel.findByPublicId(orderPublicId)
  if (!order) throw ApiError.notFound('Order not found.')

  const allowed = ORDER_TRANSITIONS[order.status] ?? []
  if (!allowed.includes(nextStatus)) {
    throw ApiError.badRequest(
      `An order that is "${order.status}" cannot become "${nextStatus}".` +
        (allowed.length ? ` Allowed: ${allowed.join(', ')}.` : ' This status is final.')
    )
  }

  if (nextStatus === 'shipped' && !extra.trackingNumber) {
    throw ApiError.badRequest('A tracking number is required when marking an order shipped.')
  }

  await withTransaction(async (conn) => {
    await orderModel.updateStatus(order.internalId, nextStatus, extra, conn)

    if (nextStatus === 'cancelled') {
      await releaseOrRestock(order, conn)
    }

    if (nextStatus === 'returned') {
      const items = await orderModel.findRawItems(order.internalId, conn)
      for (const item of items) {
        if (!item.variant_id) continue
        await variantModel.restock(item.variant_id, item.quantity, conn)
        if (item.product_id) await productModel.recalcStock(item.product_id, conn)
      }
    }
  })

  logger.info({ orderNumber: order.orderNumber, from: order.status, to: nextStatus }, 'order status changed')
  return orderModel.findByPublicId(orderPublicId).then((o) => ({ ...o, internalId: undefined }))
}

/**
 * An unpaid order releases its reservation; a paid one has already had stock
 * deducted, so cancelling must add it back.
 */
async function releaseOrRestock(order, conn) {
  const items = await orderModel.findRawItems(order.internalId, conn)
  const wasPaid = order.paymentStatus === 'paid'

  for (const item of items) {
    if (!item.variant_id) continue
    if (wasPaid) {
      await variantModel.restock(item.variant_id, item.quantity, conn)
    } else {
      await variantModel.releaseReservation(item.variant_id, item.quantity, conn)
    }
    if (item.product_id) await productModel.recalcStock(item.product_id, conn)
  }
}

/** A customer cancelling their own order. */
export async function cancelByCustomer(orderPublicId, requester) {
  const order = await orderModel.findByPublicId(orderPublicId)
  if (!order) throw ApiError.notFound('Order not found.')
  if (!order.customerId || order.customerId !== requester.publicId) {
    throw ApiError.notFound('Order not found.')
  }
  if (!['pending', 'processing'].includes(order.status)) {
    throw ApiError.badRequest(
      `This order is already ${order.status} and can no longer be cancelled.`
    )
  }
  return updateStatus(orderPublicId, 'cancelled')
}

export async function updateTracking(orderPublicId, { courier, trackingNumber }) {
  const order = await orderModel.findByPublicId(orderPublicId)
  if (!order) throw ApiError.notFound('Order not found.')

  await orderModel.updateStatus(order.internalId, order.status, { courier, trackingNumber })
  return orderModel.findByPublicId(orderPublicId).then((o) => ({ ...o, internalId: undefined }))
}

export async function updateNote(orderPublicId, adminNote) {
  const order = await orderModel.findByPublicId(orderPublicId)
  if (!order) throw ApiError.notFound('Order not found.')

  await orderModel.updateNote(order.internalId, adminNote)
  return orderModel.findByPublicId(orderPublicId).then((o) => ({ ...o, internalId: undefined }))
}

export async function getCustomerOrders(customerPublicId, { limit, offset }) {
  const customer = await userModel.findByPublicId(customerPublicId)
  if (!customer) throw ApiError.notFound('Customer not found.')

  const { items, total } = await orderModel.findAll({ userId: customer.internalId, limit, offset })
  return { items: items.map(({ internalId: _i, ...o }) => o), total }
}

/**
 * Releases stock held by checkouts that were never paid.
 * Run from a scheduled job — see src/services/jobs.service.js.
 */
export async function releaseStaleReservations() {
  const stale = await orderModel.findStalePending(env.business.reservationTtlMinutes)
  let released = 0

  for (const row of stale) {
    try {
      await withTransaction(async (conn) => {
        const items = await orderModel.findRawItems(row.id, conn)
        for (const item of items) {
          if (!item.variant_id) continue
          await variantModel.releaseReservation(item.variant_id, item.quantity, conn)
          if (item.product_id) await productModel.recalcStock(item.product_id, conn)
        }
        await orderModel.updateStatus(row.id, 'cancelled', {}, conn)
        await orderModel.markPaymentFailed(row.id, conn)
      })
      released += 1
      logger.info({ orderNumber: row.order_number }, 'released stale reservation')
    } catch (err) {
      logger.error({ err, orderId: row.id }, 'failed to release stale reservation')
    }
  }
  return released
}
