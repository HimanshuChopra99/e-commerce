import Stripe from 'stripe';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { withTransaction, pool } from '../config/database.js';
import { ApiError } from '../utils/api-error.js';
import { toCents, fromCents, centsToNumber } from '../utils/money.js';
import * as orderModel from '../models/order.model.js';
import * as variantModel from '../models/variant.model.js';
import * as productModel from '../models/product.model.js';
import * as eventModel from '../models/stripe-event.model.js';
import * as cartModel from '../models/cart.model.js';
import { deleteCached, deleteCachedPattern } from './cache.service.js';

// Initialize Stripe only if secret key is configured
let stripe = null;

function getStripe() {
  if (!env.stripe.enabled) {
    return null;
  }
  if (!stripe) {
    stripe = new Stripe(env.stripe.secretKey, {
      apiVersion: '2024-12-18.acacia',
    });
  }
  return stripe;
}

function assertStripe() {
  const s = getStripe();
  if (!s) {
    throw ApiError.unavailable(
      'Payments are not configured on this server. Please set STRIPE_SECRET_KEY.'
    );
  }
}

/**
 * Creates (or reuses) the PaymentIntent for an order.
 *
 * The idempotency key means a retried request returns the SAME intent instead
 * of charging the customer twice.
 */
export async function createPaymentIntent(orderPublicId, requester) {
  const s = getStripe();
  if (!s) {
    throw ApiError.unavailable('Payments are not configured on this server.');
  }

  const order = await orderModel.findByPublicId(orderPublicId);
  if (!order) throw ApiError.notFound('Order not found.');

  const isAdmin = requester?.role === 'admin';
  const owns = order.customerId && requester?.publicId === order.customerId;
  const isGuest = !order.customerId;
  if (!isAdmin && !owns && !isGuest)
    throw ApiError.notFound('Order not found.');

  if (order.paymentStatus === 'paid') {
    throw ApiError.badRequest('This order has already been paid.');
  }
  if (['cancelled', 'returned'].includes(order.status)) {
    throw ApiError.badRequest('This order can no longer be paid.');
  }
  if (order.paymentMethod === 'cod') {
    throw ApiError.badRequest('Cash-on-delivery orders are not paid online.');
  }

  const amountCents = toCents(order.total);

  try {
    const intent = await s.paymentIntents.create(
      {
        amount: amountCents,
        currency: order.currency.toLowerCase(),
        automatic_payment_methods: { enabled: true },
        metadata: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          userId: order.customerId ?? 'guest',
        },
        receipt_email: order.customerEmail,
        description: `Kick order ${order.orderNumber}`,
      },
      { idempotencyKey: `order_${order.id}_intent` }
    );

    await orderModel.setPaymentIntent(order.internalId, intent.id);

    return {
      clientSecret: intent.client_secret,
      publishableKey: env.stripe.publishableKey,
      amount: centsToNumber(amountCents),
      currency: order.currency,
    };
  } catch (err) {
    logger.error(
      { err, orderNumber: order.orderNumber },
      'Stripe intent creation failed'
    );
    throw new ApiError(
      502,
      'PAYMENT_PROVIDER_ERROR',
      'Could not start the payment. Please try again.'
    );
  }
}

/** Lets the confirmation page poll for the webhook result. */
export async function getPaymentStatus(orderPublicId, requester) {
  const order = await orderModel.findByPublicId(orderPublicId);
  if (!order) throw ApiError.notFound('Order not found.');

  const isAdmin = requester?.role === 'admin';
  const owns = order.customerId && requester?.publicId === order.customerId;
  if (!isAdmin && !owns && order.customerId)
    throw ApiError.notFound('Order not found.');

  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    total: order.total,
    paidAt: order.paidAt,
  };
}

/**
 * Verifies the webhook signature against the RAW body.
 *
 * Express must not have parsed this body — see the raw-body mount in app.js.
 */
export function constructEvent(rawBody, signature) {
  const s = getStripe();
  if (!s) {
    throw ApiError.unavailable('Stripe is not configured.');
  }
  if (!env.stripe.webhookSecret) {
    throw ApiError.badRequest('Stripe webhook secret is not configured.');
  }
  try {
    return s.webhooks.constructEvent(
      rawBody,
      signature,
      env.stripe.webhookSecret
    );
  } catch (err) {
    logger.warn({ err: err.message }, 'invalid Stripe webhook signature');
    throw ApiError.badRequest(
      `Webhook signature verification failed: ${err.message}`
    );
  }
}

/** Records the event. Returns false when it's a duplicate Stripe retry. */
export async function recordEvent(event) {
  return eventModel.record(event.id, event.type);
}

export async function markEventProcessed(eventId) {
  await eventModel.markProcessed(eventId);
}

export async function markEventFailed(eventId, message) {
  await eventModel.markFailed(eventId, message);
}

/**
 * Payment succeeded — the single place an order becomes `paid`.
 *
 * The browser redirect is never trusted for this; only this signed
 * server-to-server webhook can mark money as received.
 */
export async function handlePaymentSucceeded(intent) {
  let customerId = null;
  await withTransaction(async (conn) => {
    const row = await orderModel.findByPaymentIntentForUpdate(intent.id, conn);
    if (!row) {
      logger.error({ intentId: intent.id }, 'webhook for an unknown order');
      return;
    }
    customerId = row.user_id;

    // Replay guard — a duplicate webhook must not deduct stock twice.
    if (row.payment_status === 'paid') {
      logger.info(
        { orderNumber: row.order_number },
        'order already paid, skipping'
      );
      return;
    }

    // Sanity-check what Stripe actually captured.
    const expected = toCents(row.grand_total);
    const received = intent.amount_received ?? intent.amount;
    if (received !== expected) {
      logger.error(
        { orderNumber: row.order_number, expected, received },
        'AMOUNT MISMATCH — flagging for manual review'
      );
      await conn.query(
        `UPDATE orders
         SET admin_note = CONCAT(COALESCE(admin_note, ''), '\n[SYSTEM] Amount mismatch: expected ',
             ?, ' received ', ?, '. Review before shipping.')
         WHERE id = ?`,
        [expected, received, row.id]
      );
    }

    await orderModel.markPaid(row.id, intent.latest_charge ?? null, conn);

    // The reservation becomes a real deduction.
    const items = await orderModel.findRawItems(row.id, conn);
    const touchedProducts = new Set();

    for (const item of items) {
      if (!item.variant_id) continue;
      await variantModel.commitReservation(
        item.variant_id,
        item.quantity,
        conn
      );
      if (item.product_id) {
        await productModel.incrementUnitsSold(
          item.product_id,
          item.quantity,
          conn
        );
        touchedProducts.add(item.product_id);
      }
    }
    for (const productId of touchedProducts) {
      await productModel.recalcStock(productId, conn);
    }
    if (row.user_id) await cartModel.clearByUser(row.user_id, conn);

    logger.info(
      { orderNumber: row.order_number, amount: received },
      'payment succeeded'
    );
  });
  if (customerId) {
    await Promise.all([
      deleteCached(`customer:${customerId}:cart`),
      deleteCachedPattern(`customer:${customerId}:orders:*`),
    ]);
  }
  // Payment succeeded → stock was committed, so refresh the public catalogue.
  await deleteCachedPattern('public:*');
}

/** Payment failed — release the hold so the stock goes back on sale. */
export async function handlePaymentFailed(intent) {
  let customerId = null;
  await withTransaction(async (conn) => {
    const row = await orderModel.findByPaymentIntentForUpdate(intent.id, conn);
    if (!row || row.payment_status === 'paid') return;
    customerId = row.user_id;

    await orderModel.markPaymentFailed(row.id, conn);

    const items = await orderModel.findRawItems(row.id, conn);
    for (const item of items) {
      if (!item.variant_id) continue;
      await variantModel.releaseReservation(
        item.variant_id,
        item.quantity,
        conn
      );
      if (item.product_id)
        await productModel.recalcStock(item.product_id, conn);
    }

    logger.warn(
      {
        orderNumber: row.order_number,
        reason: intent.last_payment_error?.message,
      },
      'payment failed'
    );
  });
  if (customerId) await deleteCachedPattern(`customer:${customerId}:orders:*`);
}

export async function handlePaymentCanceled(intent) {
  await handlePaymentFailed(intent);
}

/** Stripe told us a refund happened (from the API or the dashboard). */
export async function handleRefund(charge) {
  const intentId = charge.payment_intent;
  if (!intentId) return;

  let customerId = null;
  await withTransaction(async (conn) => {
    const row = await orderModel.findByPaymentIntentForUpdate(intentId, conn);
    if (!row) return;
    customerId = row.user_id;

    const refundedCents = charge.amount_refunded ?? 0;
    const totalCents = toCents(row.grand_total);
    const fully = refundedCents >= totalCents;

    await orderModel.recordRefund(
      row.id,
      fromCents(refundedCents),
      fully,
      conn
    );
    logger.info(
      {
        orderNumber: row.order_number,
        refunded: centsToNumber(refundedCents),
        fully,
      },
      'refund recorded'
    );
  });
  if (customerId) await deleteCachedPattern(`customer:${customerId}:orders:*`);
}

/**
 * Admin-initiated refund.
 *
 * The DB is updated by the resulting `charge.refunded` webhook, so there's
 * exactly one code path that records a refund.
 */
export async function refundOrder(
  orderPublicId,
  { amount, reason, restock = false }
) {
  const s = getStripe();
  if (!s) {
    throw ApiError.unavailable('Payments are not configured on this server.');
  }

  const order = await orderModel.findByPublicId(orderPublicId);
  if (!order) throw ApiError.notFound('Order not found.');
  if (order.paymentStatus !== 'paid') {
    throw ApiError.badRequest(
      'This order has not been paid, so there is nothing to refund.'
    );
  }

  const intentId = await getIntentId(order.internalId);
  if (!intentId)
    throw ApiError.badRequest('No Stripe payment is attached to this order.');

  const alreadyCents = toCents(order.refundedAmount);
  const maxCents = toCents(order.total) - alreadyCents;
  if (maxCents <= 0)
    throw ApiError.badRequest('This order is already fully refunded.');

  const refundCents = amount ? toCents(amount) : maxCents;
  if (refundCents > maxCents) {
    throw ApiError.badRequest(
      `The most you can refund is ${centsToNumber(maxCents)} ${order.currency}.`
    );
  }

  try {
    const refund = await s.refunds.create(
      {
        payment_intent: intentId,
        amount: refundCents,
        reason: reason ?? 'requested_by_customer',
        metadata: { orderNumber: order.orderNumber },
      },
      { idempotencyKey: `refund_${order.id}_${alreadyCents + refundCents}` }
    );

    if (restock) {
      await withTransaction(async (conn) => {
        const items = await orderModel.findRawItems(order.internalId, conn);
        for (const item of items) {
          if (!item.variant_id) continue;

          // Only restock variants that are still active and not deleted
          const [variantRows] = await conn.query(
            `SELECT v.id, v.is_active, p.deleted_at, p.status
             FROM product_variants v
             JOIN products p ON p.id = v.product_id
             WHERE v.id = ?`,
            [item.variant_id]
          );
          const variant = variantRows[0];
          if (
            !variant ||
            !variant.is_active ||
            variant.deleted_at ||
            variant.status !== 'active'
          ) {
            logger.warn(
              { variantId: item.variant_id, orderNumber: order.orderNumber },
              'skipping restock for inactive/deleted variant'
            );
            continue;
          }

          await variantModel.restock(item.variant_id, item.quantity, conn);
          if (item.product_id)
            await productModel.recalcStock(item.product_id, conn);
        }
      });
    }

    logger.info(
      {
        orderNumber: order.orderNumber,
        amount: centsToNumber(refundCents),
        restock,
      },
      'refund issued'
    );
    if (restock) await deleteCachedPattern('public:*');
    return {
      refundId: refund.id,
      amount: centsToNumber(refundCents),
      status: refund.status,
    };
  } catch (err) {
    if (err.type?.startsWith('Stripe')) {
      logger.error(
        { err, orderNumber: order.orderNumber },
        'Stripe refund failed'
      );
      throw new ApiError(502, 'PAYMENT_PROVIDER_ERROR', err.message);
    }
    throw err;
  }
}

async function getIntentId(orderInternalId) {
  const [rows] = await pool.query(
    'SELECT stripe_payment_intent_id FROM orders WHERE id = ?',
    [orderInternalId]
  );
  return rows[0]?.stripe_payment_intent_id ?? null;
}
