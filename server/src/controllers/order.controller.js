import { asyncHandler } from '../utils/async-handler.js'
import { ok, created, paginated } from '../utils/api-response.js'
import { getPagination, buildMeta } from '../utils/helpers.js'
import { ApiError } from '../utils/api-error.js'
import { env } from '../config/env.js'
import * as orderService from '../services/order.service.js'
import * as paymentService from '../services/payment.service.js'

/** POST /api/orders/quote — live cart totals, nothing persisted. */
export const quote = asyncHandler(async (req, res) => {
  ok(res, await orderService.quote(req.body.items))
})

/**
 * POST /api/orders — checkout.
 *
 * Works for guests (email required) and signed-in customers. Creates the
 * order with stock reserved, then hands back a Stripe clientSecret unless
 * the order is cash-on-delivery.
 */
export const create = asyncHandler(async (req, res) => {
  if (!req.user && !req.body.email) {
    throw ApiError.badRequest('An email address is required for guest checkout.')
  }

  const { order } = await orderService.createOrder({ user: req.user, input: req.body })

  let payment = null
  if (order.paymentMethod !== 'cod' && env.stripe.enabled) {
    try {
      payment = await paymentService.createPaymentIntent(order.id, req.user)
    } catch (err) {
      // The order exists with stock reserved; the customer can retry payment.
      // The cleanup job releases it if they never do.
      payment = { error: err.message }
    }
  }

  created(res, { order, payment })
})

/** GET /api/orders — the signed-in customer's own orders. */
export const listMine = asyncHandler(async (req, res) => {
  const { page, limit, offset } = getPagination(req.query)
  const { items, total } = await orderService.listForUser(req.user.id, { limit, offset })
  paginated(res, items, buildMeta({ page, limit, total }))
})

/** GET /api/orders/:id — ownership enforced in the service. */
export const getOne = asyncHandler(async (req, res) => {
  ok(res, await orderService.getOrder(req.params.id, req.user))
})

/** POST /api/orders/:id/cancel */
export const cancel = asyncHandler(async (req, res) => {
  ok(res, await orderService.cancelByCustomer(req.params.id, req.user))
})

/** GET /api/orders/:id/payment-status — polled by the confirmation page. */
export const paymentStatus = asyncHandler(async (req, res) => {
  ok(res, await paymentService.getPaymentStatus(req.params.id, req.user))
})

/** POST /api/orders/:id/pay — creates or reuses the PaymentIntent. */
export const pay = asyncHandler(async (req, res) => {
  ok(res, await paymentService.createPaymentIntent(req.params.id, req.user))
})
