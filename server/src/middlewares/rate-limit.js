import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

/**
 * Rate limits.
 *
 * The default store is in-memory, which means limits are PER PROCESS. That's
 * fine for a single instance. When you scale to several processes or machines,
 * the `rate-limit-redis` store shares the counters across instances.
 *
 * IMPORTANT: express-rate-limit forbids reusing a single Store across multiple
 * limiters (ERR_ERL_STORE_REUSE) and would throw at boot when Redis is up. So
 * each limiter gets its OWN RedisStore, each with a unique prefix, all sharing
 * one Redis connection.
 */
let redis = null;
let RedisStore = null;

async function connectRedisStore() {
  if (!env.redis.url || redis) return;
  try {
    ({ default: RedisStore } = await import('rate-limit-redis'));
    const { default: Redis } = await import('ioredis');
    const conn = new Redis(env.redis.url, {
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      connectTimeout: 750,
      retryStrategy: () => null,
    });
    let warned = false;
    conn.on('error', (error) => {
      if (warned) return;
      warned = true;
      logger.warn(
        { err: error.message },
        'Redis rate-limit store unavailable; requests will fail open'
      );
    });
    conn.on('ready', () => {
      warned = false;
    });
    await conn.connect();
    redis = conn;
  } catch (error) {
    redis?.disconnect(false);
    redis = null;
    RedisStore = null;
    logger.warn(
      { err: error.message },
      'Redis rate-limit store unavailable; using process-local limits'
    );
  }
}

/** Build a dedicated store for ONE limiter (unique prefix). */
function storeFor(prefix) {
  if (!redis || !RedisStore) return undefined;
  return new RedisStore({
    prefix,
    sendCommand: (...args) => redis.call(...args),
  });
}

await connectRedisStore();

const body = {
  success: false,
  error: {
    code: 'RATE_LIMITED',
    message: 'Too many requests. Please try again later.',
  },
};

const base = {
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  passOnStoreError: true,
  message: body,
  skip: (req) => env.isTest || req.path === '/api/health',
};

/** Broad safety net for the whole API. */
export const globalLimiter = rateLimit({
  ...base,
  store: storeFor('rl:global:'),
  windowMs: 15 * 60 * 1000,
  limit: 1000,
});

/** Brute-force protection. Successful logins don't count toward the limit. */
export const loginLimiter = rateLimit({
  ...base,
  store: storeFor('rl:login:'),
  windowMs: 15 * 60 * 1000,
  limit: 8,
  skipSuccessfulRequests: true,
  keyGenerator: (req) =>
    `${req.ip}:${String(req.body?.email ?? '').toLowerCase()}`,
});

export const registerLimiter = rateLimit({
  ...base,
  store: storeFor('rl:register:'),
  windowMs: 60 * 60 * 1000,
  limit: 10,
});

/** Stops someone spamming password-reset emails at a victim. */
export const passwordResetLimiter = rateLimit({
  ...base,
  store: storeFor('rl:password-reset:'),
  windowMs: 60 * 60 * 1000,
  limit: 5,
  keyGenerator: (req) =>
    `${req.ip}:${String(req.body?.email ?? '').toLowerCase()}`,
});

/** Checkout is expensive (locks rows, calls Stripe) — keep it tight. */
export const checkoutLimiter = rateLimit({
  ...base,
  store: storeFor('rl:checkout:'),
  windowMs: 60 * 60 * 1000,
  limit: 20,
  keyGenerator: (req) => req.user?.publicId ?? req.ip,
});

/** Product listing / search hits the DB; cap it but allow normal browsing. */
export const searchLimiter = rateLimit({
  ...base,
  store: storeFor('rl:search:'),
  windowMs: 60 * 1000,
  limit: 300,
});
