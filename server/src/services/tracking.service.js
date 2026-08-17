import { getRedisClient } from './cache.service.js'
import { logger } from '../config/logger.js'

/**
 * Live order-tracking sessions.
 *
 * Why Redis and not MySQL: a courier pings every few seconds while a parcel is
 * out for delivery. That is write-heavy, worthless once the box is handed over,
 * and nobody audits it later — exactly the workload you do NOT want hammering
 * your orders table. Redis gives us cheap writes plus a TTL that garbage-
 * collects the whole session automatically 24h after the last activity.
 *
 * Two keys per parcel:
 *   tracking:session:{trackingNumber}  HASH  — destination, current position, status
 *   tracking:pings:{trackingNumber}    LIST  — last 100 points, oldest → newest
 *
 * Both are refreshed to 24h on every ping, so a long delivery never expires
 * mid-route, while an abandoned one disappears on its own.
 *
 * Redis is OPTIONAL in this codebase (REDIS_URL may be empty in dev), so every
 * function falls back to an in-process Map. Same behaviour, single instance
 * only — which is fine for local dev and keeps `npm run dev` working without
 * Docker. Nothing here throws on a Redis failure; the worst case is a lost ping.
 */

const SESSION_TTL_SECONDS = 24 * 60 * 60 // 24 hours
const MAX_PINGS = 100

const sessionKey = (trackingNumber) => `tracking:session:${trackingNumber}`
const pingsKey = (trackingNumber) => `tracking:pings:${trackingNumber}`

/* ------------------------------------------------------------------ *
 * In-memory fallback (used only when Redis is unavailable)
 * ------------------------------------------------------------------ */

/** trackingNumber -> { session: object, pings: array, expiresAt: number } */
const memory = new Map()

function memoryGet(trackingNumber) {
  const entry = memory.get(trackingNumber)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    memory.delete(trackingNumber)
    return null
  }
  return entry
}

function memoryTouch(entry) {
  entry.expiresAt = Date.now() + SESSION_TTL_SECONDS * 1000
}

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

/** Redis hashes hold strings only — '' round-trips back to null. */
function str(value) {
  return value === null || value === undefined ? '' : String(value)
}

function num(value) {
  const n = Number.parseFloat(value)
  return Number.isFinite(n) ? n : null
}

function isValidLatLng(lat, lng) {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 && lat <= 90 &&
    lng >= -180 && lng <= 180
  )
}

/** Hash of strings -> the typed object the API and frontend consume. */
function parseSession(hash) {
  if (!hash || !hash.trackingNumber) return null
  return {
    trackingNumber: hash.trackingNumber,
    orderId: hash.orderId || null,
    orderNumber: hash.orderNumber || null,
    status: hash.status || 'active',
    courier: hash.courier || null,
    customerName: hash.customerName || null,
    destination: {
      address: hash.destinationAddress || null,
      lat: num(hash.destLat),
      lng: num(hash.destLng),
    },
    current: {
      lat: num(hash.currentLat),
      lng: num(hash.currentLng),
      at: hash.lastPingAt || null,
    },
    pingCount: Number.parseInt(hash.pingCount, 10) || 0,
    createdAt: hash.createdAt || null,
    updatedAt: hash.updatedAt || null,
    completedAt: hash.completedAt || null,
  }
}

/* ------------------------------------------------------------------ *
 * 1. Create — called when an order is marked shipped
 * ------------------------------------------------------------------ */

/**
 * @param {object} order  - mapped order (needs trackingNumber; uses publicId, orderNumber, courier, shippingAddress)
 * @param {{lat:number,lng:number}|null} coords - from utils/geocode.js, may be null
 * @returns {Promise<object|null>} the created session, or null if it couldn't be stored
 */
export async function createTrackingSession(order, coords = null) {
  const trackingNumber = order?.trackingNumber
  if (!trackingNumber) {
    logger.warn({ orderId: order?.publicId }, 'Cannot start tracking session without a tracking number')
    return null
  }

  const now = new Date().toISOString()
  const address = order.shippingAddress ?? {}
  const destinationAddress = [address.line1, address.city, address.state, address.postalCode, address.country]
    .filter(Boolean)
    .join(', ')

  // Geocoding is best-effort — a null coords just means no destination pin yet.
  const hash = {
    trackingNumber,
    orderId: str(order.publicId ?? order.id),
    orderNumber: str(order.orderNumber),
    status: 'active',
    courier: str(order.courier),
    customerName: str(address.name ?? order.customerName),
    destinationAddress: str(destinationAddress),
    destLat: str(coords?.lat),
    destLng: str(coords?.lng),
    currentLat: '',
    currentLng: '',
    lastPingAt: '',
    pingCount: '0',
    createdAt: now,
    updatedAt: now,
    completedAt: '',
  }

  const redis = await getRedisClient()

  if (redis) {
    try {
      await redis
        .multi()
        .del(pingsKey(trackingNumber)) // a re-ship must not inherit the old route
        .hset(sessionKey(trackingNumber), hash)
        .expire(sessionKey(trackingNumber), SESSION_TTL_SECONDS)
        .exec()

      logger.info({ trackingNumber, geocoded: Boolean(coords) }, 'Tracking session created')
      return parseSession(hash)
    } catch (error) {
      logger.warn({ err: error, trackingNumber }, 'Redis unavailable — tracking session kept in memory')
    }
  }

  memory.set(trackingNumber, {
    session: hash,
    pings: [],
    expiresAt: Date.now() + SESSION_TTL_SECONDS * 1000,
  })
  return parseSession(hash)
}

/* ------------------------------------------------------------------ *
 * 2. Read
 * ------------------------------------------------------------------ */

/** @returns {Promise<object|null>} null when unknown or expired. */
export async function getTrackingSession(trackingNumber) {
  if (!trackingNumber) return null

  const redis = await getRedisClient()
  if (redis) {
    try {
      const hash = await redis.hgetall(sessionKey(trackingNumber))
      if (hash && Object.keys(hash).length) return parseSession(hash)
    } catch (error) {
      logger.warn({ err: error, trackingNumber }, 'Failed to read tracking session from Redis')
    }
  }

  return parseSession(memoryGet(trackingNumber)?.session)
}

/* ------------------------------------------------------------------ *
 * 3. Save a ping
 * ------------------------------------------------------------------ */

/**
 * Record one courier position: updates the session's last known point and
 * appends to the route list, trimmed to the newest MAX_PINGS.
 *
 * Refuses to create a session implicitly — an unknown tracking number returns
 * null so a stray/spoofed ping can't invent a delivery out of thin air.
 *
 * @returns {Promise<{lat:number,lng:number,at:string}|null>}
 */
export async function savePing(trackingNumber, lat, lng) {
  if (!trackingNumber) return null

  const latitude = Number.parseFloat(lat)
  const longitude = Number.parseFloat(lng)
  if (!isValidLatLng(latitude, longitude)) {
    logger.warn({ trackingNumber, lat, lng }, 'Rejected tracking ping with invalid coordinates')
    return null
  }

  const at = new Date().toISOString()
  const ping = { lat: latitude, lng: longitude, at }

  const redis = await getRedisClient()
  if (redis) {
    try {
      const exists = await redis.exists(sessionKey(trackingNumber))
      if (!exists) return null

      await redis
        .multi()
        .rpush(pingsKey(trackingNumber), JSON.stringify(ping))
        .ltrim(pingsKey(trackingNumber), -MAX_PINGS, -1) // keep newest 100, chronological
        .hset(sessionKey(trackingNumber), {
          currentLat: String(latitude),
          currentLng: String(longitude),
          lastPingAt: at,
          updatedAt: at,
        })
        .hincrby(sessionKey(trackingNumber), 'pingCount', 1)
        // Sliding TTL: an actively moving parcel never expires mid-route.
        .expire(sessionKey(trackingNumber), SESSION_TTL_SECONDS)
        .expire(pingsKey(trackingNumber), SESSION_TTL_SECONDS)
        .exec()

      return ping
    } catch (error) {
      logger.warn({ err: error, trackingNumber }, 'Failed to save tracking ping to Redis')
      return null
    }
  }

  const entry = memoryGet(trackingNumber)
  if (!entry) return null

  entry.pings.push(ping)
  if (entry.pings.length > MAX_PINGS) entry.pings = entry.pings.slice(-MAX_PINGS)
  Object.assign(entry.session, {
    currentLat: String(latitude),
    currentLng: String(longitude),
    lastPingAt: at,
    updatedAt: at,
    pingCount: String(Number(entry.session.pingCount || 0) + 1),
  })
  memoryTouch(entry)
  return ping
}

/* ------------------------------------------------------------------ *
 * 4. Read the route
 * ------------------------------------------------------------------ */

/**
 * Last MAX_PINGS positions, oldest → newest — feed straight into a Leaflet
 * polyline. Unknown tracking number returns [] rather than null so the caller
 * can always `.map()` over it.
 *
 * @returns {Promise<Array<{lat:number,lng:number,at:string}>>}
 */
export async function getRecentPings(trackingNumber) {
  if (!trackingNumber) return []

  const redis = await getRedisClient()
  if (redis) {
    try {
      const raw = await redis.lrange(pingsKey(trackingNumber), 0, -1)
      return raw
        .map((item) => {
          try {
            return JSON.parse(item)
          } catch {
            return null // one corrupt entry must not break the whole route
          }
        })
        .filter(Boolean)
    } catch (error) {
      logger.warn({ err: error, trackingNumber }, 'Failed to read tracking pings from Redis')
      return []
    }
  }

  return memoryGet(trackingNumber)?.pings.slice() ?? []
}

/* ------------------------------------------------------------------ *
 * 5. Complete — called when the order is marked delivered
 * ------------------------------------------------------------------ */

/**
 * Marks the session completed. The keys are deliberately left to expire on
 * their own TTL so the customer can still open the map and see the finished
 * route for the next 24h.
 *
 * @returns {Promise<object|null>} the completed session, or null if unknown.
 */
export async function completeSession(trackingNumber) {
  if (!trackingNumber) return null

  const at = new Date().toISOString()

  const redis = await getRedisClient()
  if (redis) {
    try {
      const exists = await redis.exists(sessionKey(trackingNumber))
      if (!exists) return null

      await redis.hset(sessionKey(trackingNumber), {
        status: 'completed',
        completedAt: at,
        updatedAt: at,
      })

      logger.info({ trackingNumber }, 'Tracking session completed')
      return getTrackingSession(trackingNumber)
    } catch (error) {
      logger.warn({ err: error, trackingNumber }, 'Failed to complete tracking session in Redis')
      return null
    }
  }

  const entry = memoryGet(trackingNumber)
  if (!entry) return null

  Object.assign(entry.session, { status: 'completed', completedAt: at, updatedAt: at })
  memoryTouch(entry)
  return parseSession(entry.session)
}

export default {
  createTrackingSession,
  getTrackingSession,
  savePing,
  getRecentPings,
  completeSession,
}
