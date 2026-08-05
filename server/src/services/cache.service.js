import Redis from 'ioredis'
import { env } from '../config/env.js'
import { logger } from '../config/logger.js'

let client = null
let unavailableUntil = 0
let warned = false
let loggedReady = false

function createClient() {
  const redis = new Redis(env.redis.url, {
    lazyConnect: true,
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
    connectTimeout: 750,
    retryStrategy: () => null,
  })
  redis.on('error', (error) => {
    if (!warned) {
      warned = true
      logger.warn({ err: error.message }, 'Redis cache unavailable; using database directly')
    }
  })
  redis.on('ready', () => {
    warned = false
    if (!loggedReady) {
      loggedReady = true
      logger.info({ url: env.redis.url }, `Redis cache connected (public TTL ${env.redis.publicCacheTtlSeconds}s, user TTL ${env.redis.cacheTtlSeconds}s)`)
    }
  })
  return redis
}

async function readyClient() {
  if (!env.redis.url || Date.now() < unavailableUntil) return null
  if (!client || client.status === 'end') client = createClient()
  try {
    if (client.status === 'wait') await client.connect()
    if (client.status !== 'ready') return null
    return client
  } catch (error) {
    unavailableUntil = Date.now() + 30_000
    if (!warned) {
      warned = true
      logger.warn({ err: error.message }, 'Redis cache unavailable; using database directly')
    }
    return null
  }
}

export async function getCachedJson(key) {
  const redis = await readyClient()
  if (!redis) return null
  try {
    const value = await redis.get(key)
    return value ? JSON.parse(value) : null
  } catch {
    return null
  }
}

export async function setCachedJson(key, value, ttlSeconds = env.redis.cacheTtlSeconds) {
  const redis = await readyClient()
  if (!redis) return false
  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds)
    return true
  } catch {
    return false
  }
}

export async function deleteCached(...keys) {
  if (!keys.length) return false
  const redis = await readyClient()
  if (!redis) return false
  try {
    await redis.del(...keys)
    return true
  } catch {
    return false
  }
}

/** Delete all paginated/list cache entries belonging to one customer. */
export async function deleteCachedPattern(pattern) {
  const redis = await readyClient()
  if (!redis) return false
  try {
    let cursor = '0'
    do {
      const [next, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100)
      cursor = next
      if (keys.length) await redis.del(...keys)
    } while (cursor !== '0')
    return true
  } catch {
    return false
  }
}

export function cacheStatus() {
  if (!env.redis.url) return 'disabled'
  return client?.status === 'ready' ? 'up' : 'fallback'
}

export async function closeCache() {
  if (!client) return
  try {
    await client.quit()
  } catch {
    client.disconnect(false)
  } finally {
    client = null
  }
}
