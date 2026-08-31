import { Server } from 'socket.io';
import { logger } from '../config/logger.js';
import { env } from '../config/env.js';
import {
  setPageState,
  setCallId,
  getPageState,
} from '../services/session-state.service.js';
import { syncRetellState } from '../services/retell-sync.service.js';
import * as trackingService from '../services/tracking.service.js';
import { haversineMeters } from '../controllers/tracking.controller.js';

let io;

// Grace-period timers: partnerPublicId → NodeJS Timeout
// We wait a short window before marking a partner offline on disconnect
// so that a page-refresh / brief network hiccup doesn't flip their status.
const offlineTimers = new Map();
const OFFLINE_GRACE_MS = 8000; // 8 seconds

// Current warehouse / hub location — updated dynamically from admin's location or default
let currentWarehouseLocation = {
  lat: 30.7333,
  lng: 76.7794,
  address: 'KICKS Main Hub',
  updatedAt: new Date().toISOString(),
};

export function getWarehouseLocation() {
  return currentWarehouseLocation;
}

export function setWarehouseLocation(coords) {
  if (coords && Number.isFinite(coords.lat) && Number.isFinite(coords.lng)) {
    currentWarehouseLocation = {
      lat: Number(coords.lat),
      lng: Number(coords.lng),
      address: coords.address || 'KICKS Main Hub',
      updatedAt: new Date().toISOString(),
    };
  }
  return currentWarehouseLocation;
}

export function initSocket(httpServer) {
  const allowedOrigins = [
    ...(env.corsOrigins || []),
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5174',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ];

  io = new Server(httpServer, {
    transports: ['websocket', 'polling'],
    cors: {
      origin: (origin, callback) => {
        // Allow requests with no origin (e.g. mobile apps, curl, or same-origin)
        if (!origin || allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(null, true); // In development, allow all origins
      },
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    const userId = socket.handshake.auth?.userId || 'guest';
    const room = `user:${userId}`;

    socket.join(room);
    logger.info(
      { socketId: socket.id, userId, room },
      '[Socket] client connected'
    );

    // ── Live Tracking Subscriptions ──────────────────────────────────────────
    socket.on('tracking:subscribe', (data) => {
      const trackingNumber =
        typeof data === 'string' ? data : data?.trackingNumber;
      if (trackingNumber) {
        const trackingRoom = `tracking:${trackingNumber}`;
        socket.join(trackingRoom);
        logger.info(
          { socketId: socket.id, trackingNumber, trackingRoom },
          '[Socket] client joined tracking room'
        );
      }
    });

    // ── Delivery Partner Pool ─────────────────────────────────────────────

    // Partner goes online: joins the order broadcast room + persists to DB
    socket.on('delivery:go_online', async (data) => {
      const partnerPublicId = data?.partnerPublicId;
      if (!partnerPublicId) return;

      // Cancel any pending offline timer for this partner (they reconnected)
      if (offlineTimers.has(partnerPublicId)) {
        clearTimeout(offlineTimers.get(partnerPublicId));
        offlineTimers.delete(partnerPublicId);
        logger.info(
          { partnerPublicId },
          '[Socket] cancelled pending offline timer — partner reconnected'
        );
      }

      socket.join('delivery:pool');
      socket.join(`delivery:partner:${partnerPublicId}`);
      socket.data.partnerPublicId = partnerPublicId;

      // Persist is_online so the admin dashboard reflects it (real data)
      try {
        const { findByPublicId, setOnlineStatus } =
          await import('../models/delivery-partner.model.js');
        const partner = await findByPublicId(partnerPublicId);
        if (partner) {
          const updated = await setOnlineStatus(partner.internalId, true);
          io.to('admin_room').emit('delivery:partner_online_status', {
            partnerPublicId: updated.publicId,
            isOnline: true,
            at: new Date().toISOString(),
          });
        }
      } catch (err) {
        logger.warn(
          { err: err.message, partnerPublicId },
          '[Socket] failed to persist online status'
        );
      }
      logger.info(
        { socketId: socket.id, partnerPublicId },
        '[Socket] delivery partner online'
      );
    });

    // Partner goes offline
    socket.on('delivery:go_offline', async (data) => {
      const partnerPublicId = data?.partnerPublicId;
      socket.leave('delivery:pool');
      if (partnerPublicId) socket.leave(`delivery:partner:${partnerPublicId}`);

      // Clear any pending grace-period timer — this is an explicit offline request
      if (partnerPublicId && offlineTimers.has(partnerPublicId)) {
        clearTimeout(offlineTimers.get(partnerPublicId));
        offlineTimers.delete(partnerPublicId);
      }

      try {
        const { findByPublicId, setOnlineStatus } =
          await import('../models/delivery-partner.model.js');
        const partner = await findByPublicId(partnerPublicId);
        if (partner) {
          const updated = await setOnlineStatus(partner.internalId, false);
          io.to('admin_room').emit('delivery:partner_online_status', {
            partnerPublicId: updated.publicId,
            isOnline: false,
            at: new Date().toISOString(),
          });
        }
      } catch (err) {
        logger.warn(
          { err: err.message, partnerPublicId },
          '[Socket] failed to persist offline status'
        );
      }
      logger.info(
        { socketId: socket.id, partnerPublicId },
        '[Socket] delivery partner offline'
      );
    });

    // Partner accepted an order: leave pool room, join private nav room
    socket.on('delivery:join_nav', (data) => {
      const { trackingNumber, partnerPublicId } = data || {};
      if (!trackingNumber) return;
      socket.leave('delivery:pool');
      socket.join(`delivery:nav:${trackingNumber}`);
      if (partnerPublicId) socket.leave(`delivery:partner:${partnerPublicId}`);
      logger.info(
        { socketId: socket.id, trackingNumber },
        '[Socket] delivery partner joined nav room'
      );
    });

    // Partner finished delivery: leave nav room
    socket.on('delivery:leave_nav', (data) => {
      const { trackingNumber } = data || {};
      if (trackingNumber) socket.leave(`delivery:nav:${trackingNumber}`);
      logger.info(
        { socketId: socket.id, trackingNumber },
        '[Socket] delivery partner left nav room'
      );
    });

    // Global current warehouse location (updated dynamically by admin or geocoding)
    socket.emit('warehouse:location', currentWarehouseLocation);

    // Admin sets/updates the real warehouse location (e.g., from Admin browser GPS)
    socket.on('admin:set_warehouse_location', (data) => {
      if (data && Number.isFinite(data.lat) && Number.isFinite(data.lng)) {
        currentWarehouseLocation = {
          lat: Number(data.lat),
          lng: Number(data.lng),
          address: data.address || 'KICKS Main Hub',
          updatedAt: new Date().toISOString(),
        };
        io.emit('warehouse:location_updated', currentWarehouseLocation);
        logger.info(
          { currentWarehouseLocation },
          '[Socket] warehouse location updated'
        );
      }
    });

    socket.on('warehouse:get_location', () => {
      socket.emit('warehouse:location', currentWarehouseLocation);
    });

    // Admin joins the admin room to receive real-time order status updates
    socket.on('admin:join', () => {
      socket.join('admin_room');
      logger.info({ socketId: socket.id }, '[Socket] admin joined admin_room');
    });

    // ── Phase 1 GPS: partner broadcasts location before pickup (no tracking# yet) ──
    socket.on('delivery:partner_location', async (data) => {
      const { orderId, lat, lng, phase } = data || {};
      if (!lat || !lng) return;

      const payload = {
        orderId,
        lat,
        lng,
        phase: phase || 'to_warehouse',
        at: new Date().toISOString(),
      };

      // Broadcast to admin room so admin can see partner heading to warehouse
      io.to('admin_room').emit('delivery:partner_location', payload);

      // Also broadcast to per-order room (if admin has subscribed to it)
      if (orderId) {
        io.to(`order:${orderId}`).emit('delivery:partner_location', payload);
      }

      // Persist latest lat/lng to DB so admin detail page always has current coords
      const partnerPublicId = socket.data?.partnerPublicId;
      if (partnerPublicId) {
        try {
          const { findByPublicId, updateLocation } =
            await import('../models/delivery-partner.model.js');
          const partner = await findByPublicId(partnerPublicId);
          if (partner) {
            await updateLocation(partner.internalId, lat, lng);
            try {
              const w = getWarehouseLocation();
              if (
                haversineMeters(lat, lng, w.lat, w.lng) <=
                env.delivery.warehouseRadiusMeters
              ) {
                const { findAll } = await import('../models/order.model.js');
                const { items } = await findAll({
                  status: 'ready_for_pickup',
                  limit: 50,
                });
                for (const order of items) {
                  io.to(`delivery:partner:${partnerPublicId}`).emit(
                    'order:ready_for_pickup',
                    {
                      orderId: order.id || order.publicId,
                      orderNumber: order.orderNumber,
                      customerName: order.customerName,
                      pickupAddress: w.address || 'KICKS Main Hub',
                      pickupLat: w.lat,
                      pickupLng: w.lng,
                      dropoffAddress:
                        [
                          order.shippingAddress?.city,
                          order.shippingAddress?.state,
                        ]
                          .filter(Boolean)
                          .join(', ') || 'Customer Location',
                      shippingAddress: order.shippingAddress ?? null,
                      itemCount: order.itemCount ?? 1,
                      total: order.total,
                      payout:
                        Number((Number(order.total || 0) * 0.08).toFixed(2)) ||
                        10,
                      status: 'ready_for_pickup',
                    }
                  );
                }
              }
            } catch (err) {
              logger.warn({ err: err.message }, 'filtered re-broadcast failed');
            }
          }
        } catch (err) {
          logger.warn(
            { err: err.message, partnerPublicId },
            '[Socket] failed to persist phase-1 location'
          );
        }
      }

      logger.debug(
        { socketId: socket.id, orderId, lat, lng, phase },
        '[Socket] Phase-1 partner location'
      );
    });

    // ── Admin subscribes to a specific order's live updates ──────────────────────
    socket.on('admin:watch_order', (data) => {
      const orderId = typeof data === 'string' ? data : data?.orderId;
      if (orderId) {
        socket.join(`order:${orderId}`);
        logger.info(
          { socketId: socket.id, orderId },
          '[Socket] admin watching order'
        );
      }
    });

    socket.on('admin:unwatch_order', (data) => {
      const orderId = typeof data === 'string' ? data : data?.orderId;
      if (orderId) {
        socket.leave(`order:${orderId}`);
        logger.info(
          { socketId: socket.id, orderId },
          '[Socket] admin stopped watching order'
        );
      }
    });

    // ── Phase transition notification (delivery partner emits when phase changes) ─
    socket.on('order:phase_changed', (data) => {
      const { orderId, phase, trackingNumber } = data || {};
      if (!orderId) return;
      const payload = {
        orderId,
        phase,
        trackingNumber,
        at: new Date().toISOString(),
      };
      io.to('admin_room').emit('order:phase_changed', payload);
      if (orderId)
        io.to(`order:${orderId}`).emit('order:phase_changed', payload);
      logger.info(
        { socketId: socket.id, orderId, phase },
        '[Socket] order phase changed'
      );
    });

    // ── Add this inside io.on('connection', (socket) => { ... }) ──

    socket.on('send-delivery-completed', async (data) => {
      const trackingNumber =
        typeof data === 'string' ? data : data?.trackingNumber;
      if (!trackingNumber) return;

      try {
        // ✅ Use completeSession instead of updateStatus
        await trackingService.completeSession(trackingNumber);

        const trackingRoom = `tracking:${trackingNumber}`;
        io.to(trackingRoom).emit('tracking:completed', { trackingNumber });

        logger.info(
          { socketId: socket.id, trackingNumber },
          '[Socket] Parcel marked as delivered'
        );
      } catch (err) {
        logger.warn(
          { err: err.message, trackingNumber },
          '[Socket] Failed to mark completed'
        );
      }
    });
    socket.on('tracking:unsubscribe', (data) => {
      const trackingNumber =
        typeof data === 'string' ? data : data?.trackingNumber;
      if (trackingNumber) {
        const trackingRoom = `tracking:${trackingNumber}`;
        socket.leave(trackingRoom);
        logger.info(
          { socketId: socket.id, trackingNumber, trackingRoom },
          '[Socket] client left tracking room'
        );
      }
    });

    // ── Live Geolocation Broadcasting (Admin / Courier) ──────────────────────
    socket.on('send-location', async (data) => {
      if (!data) return;
      const latitude = Number.parseFloat(data.latitude ?? data.lat);
      const longitude = Number.parseFloat(data.longitude ?? data.lng);

      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return;
      }

      console.log('Location received:', longitude, latitude);

      // Persist to DB so admin can always query partner's latest location
      const partnerPublicId = socket.data?.partnerPublicId;
      if (partnerPublicId) {
        try {
          const { findByPublicId, updateLocation } =
            await import('../models/delivery-partner.model.js');
          const partner = await findByPublicId(partnerPublicId);
          if (partner)
            await updateLocation(partner.internalId, latitude, longitude);
        } catch (err) {
          logger.warn(
            { err: err.message, partnerPublicId },
            '[Socket] failed to persist send-location to DB'
          );
        }
      }

      const trackingNumbers = Array.isArray(data.trackingNumbers)
        ? data.trackingNumbers.filter(Boolean)
        : data.trackingNumber
          ? [data.trackingNumber]
          : [];

      const at = new Date().toISOString();

      // Broadcast generic receive-location for any global listener
      io.emit('receive-location', {
        latitude,
        longitude,
        lat: latitude,
        lng: longitude,
        trackingNumbers,
        at,
      });

      for (const tNum of trackingNumbers) {
        try {
          const ping = await trackingService.savePing(
            tNum,
            latitude,
            longitude
          );
          const session = await trackingService.getTrackingSession(tNum);
          const destination = session?.destination ?? {};

          const distanceMeters =
            Number.isFinite(destination.lat) && Number.isFinite(destination.lng)
              ? Math.round(
                  haversineMeters(
                    latitude,
                    longitude,
                    destination.lat,
                    destination.lng
                  )
                )
              : null;

          const trackingRoom = `tracking:${tNum}`;
          io.to(trackingRoom).emit('tracking:update', {
            trackingNumber: tNum,
            lat: latitude,
            lng: longitude,
            latitude,
            longitude,
            at: ping?.at || at,
            distanceMeters,
            status: session?.status ?? 'active',
          });

          io.to(trackingRoom).emit('receive-location', {
            trackingNumber: tNum,
            lat: latitude,
            lng: longitude,
            latitude,
            longitude,
            at: ping?.at || at,
            distanceMeters,
          });

          if (distanceMeters !== null && distanceMeters <= 1000) {
            io.to(trackingRoom).emit('tracking:nearby', {
              trackingNumber: tNum,
              distanceMeters,
              at: ping?.at || at,
            });
          }
        } catch (err) {
          logger.warn(
            { err: err.message, tNum },
            '[Socket] Failed to process send-location for parcel'
          );
        }
      }
    });

    socket.on('retell-call-started', (data) => {
      const callId = data?.callId || data?.call_id || null;
      logger.info(
        { socketId: socket.id, userId, callId, data },
        '[Socket] retell call started'
      );
      if (callId) {
        setCallId(userId, callId);
        const state = getPageState(userId);
        if (state) syncRetellState(state);
      }
    });

    socket.on('retell-call-ended', (data) => {
      logger.info(
        { socketId: socket.id, userId, data },
        '[Socket] retell call ended'
      );
      setCallId(userId, null);
    });

    // The client reports which page/filters/product details are open
    socket.on('page:update', (data) => {
      const info = typeof data === 'object' && data !== null ? data : {};
      setPageState(userId, info);
      const state = getPageState(userId);
      if (state && state.callId) {
        syncRetellState(state);
      }
    });

    // The client reports explicit cart actions (add, remove, quantity change)
    socket.on('cart:action', (data) => {
      const actionInfo = typeof data === 'object' && data !== null ? data : {};
      const {
        action,
        productName = 'item',
        color,
        size,
        quantity,
      } = actionInfo;

      let lastActionPrompt = actionInfo.lastAction || '';
      if (action === 'add_to_cart') {
        lastActionPrompt = `[CRITICAL DIRECTIVE] User just clicked "ADD TO CART" for "${productName}"${size ? ` in size ${size}` : ''}${color ? ` (${color})` : ''}. You MUST speak out loud IMMEDIATELY! React with enthusiasm, hype, and funny witty shoe-store flair celebrating them adding this fresh pair!`;
      } else if (action === 'remove_from_cart') {
        lastActionPrompt = `[CRITICAL DIRECTIVE] User just clicked "REMOVE FROM CART" for "${productName}". You MUST speak out loud IMMEDIATELY with funny, playful dramatic shock like "Wait, you're ditching those?!"`;
      } else if (action === 'increase_quantity') {
        lastActionPrompt = `[CRITICAL DIRECTIVE] User just increased quantity of "${productName}" in cart to ${quantity}. You MUST speak out loud IMMEDIATELY in a funny, hype sneakerhead persona like "Doubling up?! I see you big spender!"`;
      } else if (action === 'decrease_quantity') {
        lastActionPrompt = `[CRITICAL DIRECTIVE] User just decreased quantity of "${productName}" in cart to ${quantity}. You MUST speak out loud IMMEDIATELY in a witty, lighthearted tone like "Trimming down the order? Keeping it sensible, I respect that!"`;
      } else if (action === 'remove_item') {
        lastActionPrompt = `[CRITICAL DIRECTIVE] User just removed "${productName}" completely from their cart. You MUST speak out loud IMMEDIATELY in a funny, sassy dramatic sneakerhead persona like "RIP to those kicks in the cart, they were nice though!"`;
      } else if (!lastActionPrompt) {
        lastActionPrompt = `User updated cart (${action || 'cart interaction'})`;
      }

      setPageState(userId, {
        cartSummary: actionInfo.cartSummary,
        lastAction: lastActionPrompt,
      });

      const state = getPageState(userId);
      if (state && state.callId) {
        // Immediate sync bypasses 400ms debounce buffer so agent speaks instantly
        syncRetellState(state, true);
      }
    });

    socket.on('disconnect', (reason) => {
      // If a delivery partner was online and drops the connection, mark them offline
      // — but only after a grace period so that a page-refresh / brief hiccup
      // doesn't permanently flip their status before they reconnect.
      const partnerPublicId = socket.data?.partnerPublicId;
      if (partnerPublicId) {
        // Don't double-schedule if a timer is already running for this partner
        if (!offlineTimers.has(partnerPublicId)) {
          const timer = setTimeout(async () => {
            offlineTimers.delete(partnerPublicId);
            try {
              const { findByPublicId, setOnlineStatus } =
                await import('../models/delivery-partner.model.js');
              const partner = await findByPublicId(partnerPublicId);
              if (partner) {
                const updated = await setOnlineStatus(
                  partner.internalId,
                  false
                );
                io.to('admin_room').emit('delivery:partner_online_status', {
                  partnerPublicId: updated.publicId,
                  isOnline: false,
                  at: new Date().toISOString(),
                });
              }
            } catch (err) {
              logger.warn(
                { err: err.message, partnerPublicId },
                '[Socket] failed to persist offline on disconnect'
              );
            }
            logger.info(
              { partnerPublicId },
              '[Socket] delivery partner marked offline after grace period'
            );
          }, OFFLINE_GRACE_MS);
          offlineTimers.set(partnerPublicId, timer);
        }
      }
      logger.info(
        { socketId: socket.id, userId, reason },
        '[Socket] client disconnected'
      );
    });
  });

  logger.info('[Socket] Socket.io server initialized');
}

export function getIO() {
  return io;
}

export function emitToUser(userId, event, payload) {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, payload);
}
