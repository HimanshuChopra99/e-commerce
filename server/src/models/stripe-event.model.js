import { query, queryOne } from '../config/database.js';

/**
 * Webhook idempotency.
 *
 * Stripe retries webhooks — the same event WILL arrive more than once. The
 * UNIQUE index on event_id is the entire mechanism: we try to insert, and a
 * duplicate-key error tells us this event was already handled.
 *
 * Without this, a retried `payment_intent.succeeded` would deduct stock twice
 * and email the customer twice.
 */

/** Returns true if this event is new (and was recorded), false if a duplicate. */
export async function record(eventId, type) {
  try {
    await query('INSERT INTO stripe_events (event_id, type) VALUES (?, ?)', [
      eventId,
      type,
    ]);
    return true;
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return false;
    throw err;
  }
}

export async function markProcessed(eventId) {
  await query(
    'UPDATE stripe_events SET processed_at = NOW(), error = NULL WHERE event_id = ?',
    [eventId]
  );
}

export async function markFailed(eventId, message) {
  await query('UPDATE stripe_events SET error = ? WHERE event_id = ?', [
    String(message).slice(0, 2000),
    eventId,
  ]);
}

/** Events that errored — alert on these; they may be paid-but-unfulfilled orders. */
export async function findFailed(limit = 50) {
  return query(
    `SELECT event_id, type, error, created_at FROM stripe_events
     WHERE processed_at IS NULL AND error IS NOT NULL
     ORDER BY created_at DESC LIMIT ?`,
    [limit]
  );
}

export async function countFailed() {
  const row = await queryOne(
    'SELECT COUNT(*) AS n FROM stripe_events WHERE processed_at IS NULL AND error IS NOT NULL'
  );
  return Number(row?.n ?? 0);
}
