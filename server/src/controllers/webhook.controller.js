import { logger } from '../config/logger.js';
import * as paymentService from '../services/payment.service.js';

/**
 * POST /api/webhooks/stripe
 *
 * Mounted with express.raw() BEFORE express.json() — signature verification
 * hashes the exact bytes Stripe sent, so the body must not be parsed first.
 *
 * This handler must never throw: an unhandled error would make Stripe retry
 * forever. It replies 200 quickly, then does the work.
 */
export async function stripeWebhook(req, res) {
  const signature = req.headers['stripe-signature'];

  let event;
  try {
    event = paymentService.constructEvent(req.body, signature);
  } catch (err) {
    // 400 tells Stripe not to retry — the signature will never become valid.
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_SIGNATURE', message: err.message },
    });
  }

  // Idempotency: the UNIQUE index on event_id rejects a repeat delivery.
  let isNew;
  try {
    isNew = await paymentService.recordEvent(event);
  } catch (err) {
    logger.error({ err, eventId: event.id }, 'could not record webhook event');
    // 500 makes Stripe retry, which is what we want if our DB blipped.
    return res.status(500).json({ received: false });
  }

  if (!isNew) {
    logger.info(
      { eventId: event.id, type: event.type },
      'duplicate webhook ignored'
    );
    return res.json({ received: true, duplicate: true });
  }

  // Acknowledge FAST — Stripe times out after 20s and retries.
  res.json({ received: true });

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await paymentService.handlePaymentSucceeded(event.data.object);
        break;
      case 'payment_intent.payment_failed':
        await paymentService.handlePaymentFailed(event.data.object);
        break;
      case 'payment_intent.canceled':
        await paymentService.handlePaymentCanceled(event.data.object);
        break;
      case 'charge.refunded':
        await paymentService.handleRefund(event.data.object);
        break;
      case 'charge.dispute.created':
        logger.error(
          { chargeId: event.data.object.id },
          'DISPUTE OPENED — respond in Stripe'
        );
        break;
      default:
        logger.debug({ type: event.type }, 'unhandled Stripe event');
    }
    await paymentService.markEventProcessed(event.id);
  } catch (err) {
    // We already replied 200, so Stripe won't retry. The row keeps the error
    // for the alerting query in jobs.service.js.
    logger.error(
      { err, eventId: event.id, type: event.type },
      'webhook processing failed'
    );
    await paymentService.markEventFailed(event.id, err.message).catch(() => {});
    logger.error(
      { ALERT: true, eventId: event.id },
      'WEBHOOK_PROCESSING_FAILED — check stripe_events table'
    );
  }
}
