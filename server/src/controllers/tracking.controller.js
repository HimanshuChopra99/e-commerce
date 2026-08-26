import { asyncHandler } from '../utils/async-handler.js';
import { ok } from '../utils/api-response.js';
import { ApiError } from '../utils/api-error.js';
import { logger } from '../config/logger.js';
import { getIO } from '../config/socket.js';
import * as trackingService from '../services/tracking.service.js';

/**
 * Live parcel tracking.
 *
 * Read is public — the tracking number IS the credential, the same trade-off
 * every courier site makes, which is why it must be long and unguessable and
 * why nothing sensitive (email, phone, order total) is ever returned here.
 *
 * Writes are admin-only: the ping and complete endpoints are what the courier
 * integration calls, and an open write endpoint would let anyone puppet a
 * delivery van across the customer's map.
 */

/** Room every viewer of one parcel shares. */
const roomFor = (trackingNumber) => `tracking:${trackingNumber}`;

/**
 * Great-circle distance in metres (Haversine).
 *
 * Straight-line, not driving distance — fine for a "your order is nearby"
 * nudge, useless as an ETA.
 */
export function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000; // Earth's mean radius, metres
  const toRad = (deg) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;

  return 2 * R * Math.asin(Math.sqrt(a));
}

/** Distance at which we tell the customer the courier is close. */
const NEARBY_RADIUS_METERS = 1000;

/**
 * GET /api/tracking/:trackingNumber
 *
 * One request returns everything the map needs: the session (destination pin,
 * current position, status) plus the recent route. Two round-trips would make
 * the map flicker on first paint.
 */
export const getSession = asyncHandler(async (req, res) => {
  const { trackingNumber } = req.params;

  const session = await trackingService.getTrackingSession(trackingNumber);
  if (!session) {
    throw ApiError.notFound('No active tracking for that number.');
  }

  const pings = await trackingService.getRecentPings(trackingNumber);

  ok(res, { session, pings });
});

/**
 * POST /api/tracking/:trackingNumber/ping   (admin)
 *
 * Stores one courier position, then pushes it to everyone watching this
 * parcel. Socket emission is best-effort — a socket failure must never fail
 * the write that already succeeded.
 */
export const savePing = asyncHandler(async (req, res) => {
  const { trackingNumber } = req.params;
  const { lat, lng } = req.body;

  const ping = await trackingService.savePing(trackingNumber, lat, lng);
  if (!ping) {
    throw ApiError.notFound('No active tracking session for that number.');
  }

  const session = await trackingService.getTrackingSession(trackingNumber);
  const destination = session?.destination ?? {};

  // Null when geocoding failed — then there is simply no proximity to report.
  const distanceMeters =
    Number.isFinite(destination.lat) && Number.isFinite(destination.lng)
      ? Math.round(
          haversineMeters(ping.lat, ping.lng, destination.lat, destination.lng)
        )
      : null;

  const io = getIO();
  if (io) {
    const room = roomFor(trackingNumber);

    io.to(room).emit('tracking:update', {
      trackingNumber,
      lat: ping.lat,
      lng: ping.lng,
      at: ping.at,
      distanceMeters,
      status: session?.status ?? 'active',
    });

    if (distanceMeters !== null && distanceMeters <= NEARBY_RADIUS_METERS) {
      io.to(room).emit('tracking:nearby', {
        trackingNumber,
        distanceMeters,
        at: ping.at,
      });
    }
  } else {
    logger.debug(
      { trackingNumber },
      'Socket.io not initialised — ping stored without broadcast'
    );
  }

  ok(res, { ping, distanceMeters });
});

/**
 * POST /api/tracking/:trackingNumber/complete   (admin)
 *
 * Marks the delivery finished. The session is left in Redis until its TTL so
 * the customer can still open the map and see the completed route.
 */
export const completeSession = asyncHandler(async (req, res) => {
  const { trackingNumber } = req.params;

  const session = await trackingService.completeSession(trackingNumber);
  if (!session) {
    throw ApiError.notFound('No active tracking session for that number.');
  }

  const io = getIO();
  if (io) {
    io.to(roomFor(trackingNumber)).emit('tracking:completed', {
      trackingNumber,
      status: session.status,
      completedAt: session.completedAt,
    });
  }

  ok(res, session);
});
