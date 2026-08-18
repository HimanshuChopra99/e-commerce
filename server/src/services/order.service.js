import { withTransaction, pool, isDatabaseConnected } from '../config/database.js'
import { env } from '../config/env.js'
import { logger } from '../config/logger.js'
import { ApiError } from '../utils/api-error.js'
import { publicId, parseJson, randomToken } from '../utils/helpers.js'
import { toCents, fromCents, centsToNumber } from '../utils/money.js'
import { ORDER_TRANSITIONS, CACHE_TTL } from '../utils/constants.js'
import * as orderModel from '../models/order.model.js'
import * as variantModel from '../models/variant.model.js'
import * as productModel from '../models/product.model.js'
import * as userModel from '../models/user.model.js'
import * as cartModel from '../models/cart.model.js'
import { deleteCached, deleteCachedPattern, getCachedJson, setCachedJson } from './cache.service.js'
import { memoryStore } from './memory-store.js'
import geocodeAddress from '../utils/geocode.js'
import { createTrackingSession } from './tracking.service.js'

const orderCacheKey = (userId, limit, offset) =>
  `customer:${userId}:orders:${limit}:${offset}`

export async function invalidateOrderCache(userId) {
  if (userId === null || userId === undefined) return
  await deleteCachedPattern(`customer:${userId}:orders:*`)
}

async function invalidateCartCache(userId) {
  if (userId === null || userId === undefined) return
  await deleteCached(`customer:${userId}:cart`)
}

function imageForColor(imagesValue, colorImagesValue, color) {
  const colorImages = parseJson(colorImagesValue, [])
  const gallery = Array.isArray(colorImages)
    ? colorImages.find(
      (entry) => entry.color?.toLocaleLowerCase() === String(color).toLocaleLowerCase()
    )
    : null
  return gallery?.images?.[0] ?? parseJson(imagesValue, [])[0] ?? null
}

/**
 * Prices the cart WITHOUT creating an order.
 *
 * The storefront calls this to show a live total. Every figure is computed
 * from the database, so the preview always matches what checkout will charge.
 */
export async function quote(items) {
  const ids = [...new Set(items.map((i) => i.variantId))]
  if (!ids.length) throw ApiError.badRequest('Your cart is empty.')

  let rows = []
  if (isDatabaseConnected()) {
    try {
      const placeholders = ids.map(() => '?').join(',')
      const [dbRows] = await pool.query(
        `SELECT v.public_id, v.size, v.color, v.stock, v.reserved, v.is_active,
                p.name, p.slug, p.price, p.status, p.images, p.color_images, p.deleted_at
         FROM product_variants v
         JOIN products p ON p.id = v.product_id
         WHERE v.public_id IN (${placeholders})`,
        ids
      )
      if (dbRows && dbRows.length > 0) rows = dbRows
    } catch { }
  }

  if (!rows.length) {
    for (const prod of memoryStore.getProducts({ limit: 1000 }).items) {
      if (!prod.variants) continue
      for (const v of prod.variants) {
        const vId = v.publicId || v.id
        if (ids.includes(vId)) {
          rows.push({
            public_id: vId,
            size: v.size,
            color: v.color,
            stock: v.stock ?? 10,
            reserved: v.reserved ?? 0,
            is_active: v.isActive !== false,
            name: prod.name,
            slug: prod.slug,
            price: prod.price,
            status: prod.status || 'active',
            images: JSON.stringify(prod.images || [prod.image]),
            color_images: JSON.stringify(prod.colorImages || []),
            deleted_at: null,
          })
        }
      }
    }
  }

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
      image: imageForColor(row.images, row.color_images, row.color),
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

  if (isDatabaseConnected()) {
    try {
      const result = await withTransaction(async (conn) => {
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
              image: imageForColor(
                line.row.images,
                line.row.color_images,
                line.row.color
              ),
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

        // COD has no Stripe success webhook. Its allocation is a real sale at
        // checkout, so commit the reservation immediately and never let the
        // unpaid-card expiry job put this stock back on sale.
        if (input.paymentMethod === 'cod') {
          const touchedProducts = new Set()
          for (const line of lines) {
            const committed = await variantModel.commitReservation(line.row.id, line.quantity, conn)
            if (!committed) {
              throw ApiError.insufficientStock(
                `"${line.row.product_name}" in size ${line.row.size} is no longer available.`
              )
            }
            if (line.row.product_id) {
              await productModel.incrementUnitsSold(line.row.product_id, line.quantity, conn)
              touchedProducts.add(line.row.product_id)
            }
          }
          for (const productId of touchedProducts) {
            await productModel.recalcStock(productId, conn)
          }
          if (user?.id) await cartModel.clearByUser(user.id, conn)
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
      if (result) {
        await invalidateOrderCache(user?.id)
        if (input.paymentMethod === 'cod') await invalidateCartCache(user?.id)
        // Stock availability changed, so drop the cached public catalogue.
        await deleteCachedPattern('public:*')
        return result
      }
    } catch (err) {
      if (err.statusCode) throw err
    }
  }

  // Memory store fallback for checkout
  const lines = []
  let subtotalCents = 0

  for (const variantId of variantIds) {
    let foundProd = null
    let foundVar = null
    for (const prod of memoryStore.getProducts({ limit: 1000 }).items) {
      const v = prod.variants?.find((v) => (v.publicId || v.id) === variantId)
      if (v) {
        foundProd = prod
        foundVar = v
        break
      }
    }

    if (!foundProd || !foundVar) {
      throw ApiError.badRequest('One of the items in your cart no longer exists.')
    }

    const wanted = merged.get(variantId)
    const available = Number(foundVar.stock ?? 10) - Number(foundVar.reserved ?? 0)

    if (available < wanted) {
      throw ApiError.insufficientStock(
        available === 0
          ? `"${foundProd.name}" in size ${foundVar.size} just sold out.`
          : `Only ${available} left of "${foundProd.name}" in size ${foundVar.size}.`,
        [{ variantId, requested: wanted, available }]
      )
    }

    const unitCents = toCents(foundProd.price)
    const lineCents = unitCents * wanted
    subtotalCents += lineCents

    // Reserve stock in memory store. COD has no payment webhook, so it must
    // become a committed allocation immediately (mirrors the DB path above).
    foundVar.reserved = (foundVar.reserved ?? 0) + wanted
    if (input.paymentMethod === 'cod') {
      foundVar.stock = (foundVar.stock ?? 0) - wanted
      foundVar.reserved -= wanted
      foundProd.unitsSold = (foundProd.unitsSold ?? 0) + wanted
    }

    lines.push({
      id: publicId(),
      productPublicId: foundProd.publicId || foundProd.id,
      productName: foundProd.name,
      productSlug: foundProd.slug,
      productImage: imageForColor(foundProd.images, foundProd.colorImages, foundVar.color),
      color: foundVar.color,
      size: foundVar.size,
      unitPrice: centsToNumber(unitCents),
      quantity: wanted,
      lineTotal: centsToNumber(lineCents),
    })
  }

  const totals = calculateTotals(subtotalCents)
  const shipping = input.shippingAddress

  const order = memoryStore.addOrder({
    customer: {
      id: user?.publicId ?? 'guest',
      name: input.customerName ?? (user ? `${user.firstName} ${user.lastName}` : shipping.name),
      email: customerEmail,
      phone: input.customerPhone ?? shipping.phone ?? null,
    },
    shippingAddress: shipping,
    items: lines,
    subtotal: totals.subtotal,
    shippingCost: totals.shipping,
    tax: totals.tax,
    grandTotal: totals.total,
    paymentMethod: input.paymentMethod,
    customerNote: input.customerNote ?? null,
  })

  order.orderNumber = `#${1000 + memoryStore.orders.length}`
  if (user?.id && input.paymentMethod === 'cod') memoryStore.clearCart(user.id)
  await invalidateOrderCache(user?.id)
  if (input.paymentMethod === 'cod') await invalidateCartCache(user?.id)
  await deleteCachedPattern('public:*')

  return { order, internalId: order.internalId || order.id, totalCents: totals.totalCents }
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
  const key = orderCacheKey(userId, limit, offset)
  const cached = await getCachedJson(key)
  if (cached) return cached

  const { items, total } = await orderModel.findAll({ userId, limit, offset })
  const ordersWithItems = await Promise.all(
    items.map(async (order) => {
      const orderItems = await orderModel.findItems(order.internalId)
      return { ...order, items: orderItems }
    })
  )
  const result = { items: ordersWithItems.map(orderModel.toPublicOrder), total }
  // Customer order history → CART-tier TTL; invalidated on any order mutation.
  await setCachedJson(key, result, CACHE_TTL.CART)
  return result
}

export async function listForAdmin(filters) {
  const { items, total } = await orderModel.findAll(filters)
  const ordersWithItems = await Promise.all(
    items.map(async (order) => {
      const orderItems = await orderModel.findItems(order.internalId)
      return { ...order, items: orderItems }
    })
  )
  return { items: ordersWithItems.map(({ internalId: _i, ...o }) => o), total }
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

  if (nextStatus === 'shipped') {
    if (!extra.trackingNumber) {
      extra.trackingNumber = `KICK-${(order.orderNumber || order.id || 'ORD').toString().replace('#', '')}-${Date.now()}`
    }
    extra.courier = extra.courier || order.courier || 'Delhivery'

    try {
      // Use saved coords first — only geocode when this order predates the
      // coordinate migration and has none stored.
      let coords = null
      if (order.shippingLat != null && order.shippingLng != null) {
        coords = { lat: Number(order.shippingLat), lng: Number(order.shippingLng) }
        logger.info({ orderId: orderPublicId }, 'Using saved shipping coords for tracking session')
      } else {
        coords = await geocodeAddress(order.shippingAddress)
        logger.info({ orderId: orderPublicId }, 'Geocoded address for tracking session (coords not pre-saved)')
      }
      logger.info({ orderId: orderPublicId, trackingNumber: extra.trackingNumber, coords }, 'Creating tracking session on shipping')
      await createTrackingSession({ ...order, ...extra }, coords)
    } catch (err) {
      logger.warn({ err: err.message, orderPublicId }, 'Failed to create tracking session')
    }
  }

  if (isDatabaseConnected()) {
    try {
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
    } catch (err) {
      if (err.statusCode) throw err
    }
  }

  await orderModel.updateStatus(order.internalId || order.id || orderPublicId, nextStatus, extra)

  logger.info({ orderNumber: order.orderNumber, from: order.status, to: nextStatus }, 'order status changed')
  await invalidateOrderCache(order.customerInternalId)
  if (nextStatus === 'cancelled' || nextStatus === 'returned') {
    // Restocked items change public availability.
    await deleteCachedPattern('public:*')
  }
  return orderModel.findByPublicId(orderPublicId).then((o) => ({
    ...o,
    internalId: undefined,
    customerInternalId: undefined,
  }))
}

/**
 * An unpaid order releases its reservation; a paid one has already had stock
 * deducted, so cancelling must add it back.
 */
async function releaseOrRestock(order, conn) {
  const items = await orderModel.findRawItems(order.internalId, conn)
  // COD commits stock on checkout because it has no Stripe success webhook.
  // Treat it like a paid allocation for inventory cancellation purposes.
  const stockWasCommitted = order.paymentStatus === 'paid' || order.paymentMethod === 'cod'

  for (const item of items) {
    if (!item.variant_id) continue
    if (stockWasCommitted) {
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

  try {
    // Use saved coords first — only geocode as a fallback for legacy orders.
    let coords = null
    if (order.shippingLat != null && order.shippingLng != null) {
      coords = { lat: Number(order.shippingLat), lng: Number(order.shippingLng) }
    } else {
      coords = await geocodeAddress(order.shippingAddress)
    }
    await createTrackingSession({ ...order, courier, trackingNumber }, coords)
  } catch (err) {
    logger.warn({ err: err.message, orderPublicId }, 'Failed to update tracking session')
  }

  await invalidateOrderCache(order.customerInternalId)
  return orderModel.findByPublicId(orderPublicId).then((o) => ({
    ...o,
    internalId: undefined,
    customerInternalId: undefined,
  }))
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
      await invalidateOrderCache(row.user_id)
      released += 1
      logger.info({ orderNumber: row.order_number }, 'released stale reservation')
    } catch (err) {
      logger.error({ err, orderId: row.id }, 'failed to release stale reservation')
    }
  }
  return released
}
