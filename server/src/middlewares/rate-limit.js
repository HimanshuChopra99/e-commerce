import rateLimit from 'express-rate-limit'
import { env } from '../config/env.js'
import { logger } from '../config/logger.js'

/**
 * Rate limits.
 *
 * The default store is in-memory, which means limits are PER PROCESS. That's
 * fine for a single instance. When you scale to several processes or machines,
 * swap in `rate-limit-redis` so the counters are shared:
 *
 *   import RedisStore from 'rate-limit-redis'
 *   store: new RedisStore({ sendCommand: (...a) => redis.call(...a) })
 */
let store
if (env.redis.url) {
  let redis
  try {
    const { default: RedisStore } = await import('rate-limit-redis')
    const { default: Redis } = await import('ioredis')
    redis = new Redis(env.redis.url, {
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      connectTimeout: 750,
      retryStrategy: () => null,
    })
    let warned = false
    redis.on('error', (error) => {
      if (warned) return
      warned = true
      logger.warn({ err: error.message }, 'Redis rate-limit store unavailable; requests will fail open')
    })
    redis.on('ready', () => { warned = false })
    await redis.connect()
    store = new RedisStore({ sendCommand: (...args) => redis.call(...args) })
  } catch (error) {
    redis?.disconnect(false)
    logger.warn({ err: error.message }, 'Redis rate-limit store unavailable; using process-local limits')
  }
}

const body = {
  success: false,
  error: { code: 'RATE_LIMITED', message: 'Too many requests. Please try again later.' },
}

const base = {
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  passOnStoreError: true,
  message: body,
  skip: (req) => env.isTest || req.path === '/api/health',
  ...(store ? { store } : {}),
}

/** Broad safety net for the whole API. */
export const globalLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  limit: 1000,
})

/** Brute-force protection. Successful logins don't count toward the limit. */
export const loginLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  limit: 8,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => `${req.ip}:${String(req.body?.email ?? '').toLowerCase()}`,
})

export const registerLimiter = rateLimit({
  ...base,
  windowMs: 60 * 60 * 1000,
  limit: 10,
})

/** Stops someone spamming password-reset emails at a victim. */
export const passwordResetLimiter = rateLimit({
  ...base,
  windowMs: 60 * 60 * 1000,
  limit: 5,
  keyGenerator: (req) => `${req.ip}:${String(req.body?.email ?? '').toLowerCase()}`,
})

/** Checkout is expensive (locks rows, calls Stripe) — keep it tight. */
export const checkoutLimiter = rateLimit({
  ...base,
  windowMs: 60 * 60 * 1000,
  limit: 20,
  keyGenerator: (req) => req.user?.publicId ?? req.ip,
})

/** Product listing / search hits the DB; cap it but allow normal browsing. */
export const searchLimiter = rateLimit({
  ...base,
  windowMs: 60 * 1000,
  limit: 300,
})
