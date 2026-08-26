import { logger } from '../config/logger.js';
import { env } from '../config/env.js';
import { pool } from '../config/database.js';
import * as orderService from './order.service.js';
import * as paymentService from './payment.service.js';
import * as tokenModel from '../models/auth-token.model.js';

/**
 * Background maintenance, run with setInterval inside the process.
 *
 * At larger scale move these to a dedicated worker or a cron container so
 * several web instances don't duplicate the work.
 */

const MINUTE = 60 * 1000;
const timers = [];

/** Frees stock held by checkouts that were never paid. */
async function releaseStaleReservations() {
  try {
    const released = await orderService.releaseStaleReservations();
    if (released > 0) logger.info({ released }, 'released stale reservations');
  } catch (err) {
    logger.error({ err }, 'releaseStaleReservations failed');
  }
}

/** Keeps auth_tokens from growing without bound. */
async function purgeExpiredTokens() {
  try {
    const deleted = await tokenModel.purgeExpired();
    if (deleted > 0) logger.info({ deleted }, 'purged expired auth tokens');
  } catch (err) {
    logger.error({ err }, 'purgeExpiredTokens failed');
  }
}

/**
 * Surfaces webhooks that errored. These may be orders where money was taken
 * but fulfilment failed — the single most important thing to be alerted on.
 */
export async function alertFailedWebhooks() {
  try {
    const [rows] = await pool
      .query(
        `SELECT id, event_id, event_type, error_message, created_at
       FROM stripe_events
       WHERE status = 'failed'
       AND created_at > NOW() - INTERVAL 1 HOUR
       LIMIT 50`
      )
      .catch(() => [[]]);
    if (rows && rows.length > 0) {
      logger.error(
        {
          count: rows.length,
          events: rows.map((r) => ({
            id: r.event_id,
            type: r.event_type,
            error: r.error_message,
          })),
        },
        'ALERT: Stripe webhook processing failures detected — manual review required'
      );
    }
  } catch (err) {
    logger.error({ err }, 'failed to check webhook events');
  }
}

/**
 * Reconciles missed webhook payment intents.
 */
export async function reconcilePayments() {
  if (!env.stripe.enabled) return;
  try {
    const [pendingOrders] = await pool
      .query(
        `SELECT id, public_id, stripe_payment_intent_id, grand_total, order_number
       FROM orders
       WHERE payment_status = 'pending'
         AND stripe_payment_intent_id IS NOT NULL
         AND placed_at > NOW() - INTERVAL 24 HOUR`
      )
      .catch(() => [[]]);
    if (!pendingOrders || pendingOrders.length === 0) return;

    for (const order of pendingOrders) {
      const stripe = paymentService.getStripe
        ? paymentService.getStripe()
        : null;
      if (!stripe) continue;
      const intent = await stripe.paymentIntents
        .retrieve(order.stripe_payment_intent_id)
        .catch(() => null);
      if (intent && intent.status === 'succeeded') {
        logger.info(
          { orderNumber: order.order_number },
          'Reconciling missed payment webhook'
        );
        await paymentService.handlePaymentSucceeded(intent);
      }
    }
  } catch (err) {
    logger.error({ err }, 'reconcilePayments failed');
  }
}

export function startJobs() {
  if (env.isTest) return;

  timers.push(setInterval(releaseStaleReservations, 15 * MINUTE));
  timers.push(setInterval(purgeExpiredTokens, 24 * 60 * MINUTE));
  timers.push(setInterval(alertFailedWebhooks, 10 * MINUTE));
  timers.push(setInterval(reconcilePayments, 10 * MINUTE));

  // Don't hold the event loop open at shutdown.
  timers.forEach((t) => t.unref?.());

  // Run once shortly after boot to clean up anything left by a restart.
  setTimeout(releaseStaleReservations, 30_000).unref?.();

  logger.info({ jobs: timers.length }, 'background jobs scheduled');
}

export function stopJobs() {
  timers.forEach(clearInterval);
  timers.length = 0;
}
