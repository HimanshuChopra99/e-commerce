import { asyncHandler } from '../utils/async-handler.js';
import { ok, created } from '../utils/api-response.js';
import { ApiError } from '../utils/api-error.js';
import * as dpService from '../services/delivery-partner.service.js';
import * as deliveryOrderService from '../services/delivery-order.service.js';
import * as dpModel from '../models/delivery-partner.model.js';

import * as orderModel from '../models/order.model.js';
import { getWarehouseLocation } from '../config/socket.js';
import { haversineMeters } from './tracking.controller.js';
import { withinRadius } from '../utils/geo.js';
import { env } from '../config/env.js';

export const register = asyncHandler(async (req, res) => {
  const result = await dpService.register(req.body);
  created(res, result);
});

export const login = asyncHandler(async (req, res) => {
  const result = await dpService.login(req.body);
  ok(res, result);
});

/**
 * The currently authenticated partner, plus live delivery stats and
 * their recent deliveries — everything the app needs on the Home,
 * Earnings and Profile screens. Real DB data, no mock.
 */
export const me = asyncHandler(async (req, res) => {
  const partner = await dpModel.findByPublicId(req.deliveryPartner.publicId);
  if (!partner) throw ApiError.notFound('Delivery partner not found.');

  const [stats, recent] = await Promise.all([
    dpModel.getStats(partner.internalId),
    dpModel.findOrders(partner.internalId, { limit: 10 }),
  ]);

  ok(res, {
    ...partner,
    stats,
    recentOrders: recent.items.map((o) => ({
      id: o.id || o.publicId,
      orderNumber: o.orderNumber || o.order_number,
      status: o.status,
      total: o.grandTotal ?? o.grand_total ?? o.total ?? 0,
      payout:
        Number(
          (
            Number(o.grandTotal ?? o.grand_total ?? o.total ?? 0) * 0.08
          ).toFixed(2)
        ) || 10,
      placedAt: o.placedAt || o.placed_at,
      customerName: o.customerName || o.customer?.name,
      itemCount: o.itemCount ?? o.items?.length ?? 1,
    })),
  });
});

/**
 * Toggle the partner's online/offline status. Persisted to the DB so the
 * admin dashboard reflects it, and gating order visibility for this partner.
 */
export const setOnline = asyncHandler(async (req, res) => {
  const isOnline = Boolean(req.body?.isOnline);
  const updated = await dpModel.setOnlineStatus(
    req.deliveryPartner.internalId,
    isOnline
  );

  // Broadcast live to the admin dashboard
  const { getIO } = await import('../config/socket.js');
  const io = getIO();
  if (io) {
    io.to('admin_room').emit('delivery:partner_online_status', {
      partnerPublicId: updated.publicId,
      isOnline: updated.isOnline,
      at: new Date().toISOString(),
    });
  }

  ok(res, updated);
});

function computeDistanceAndEta(lat1, lon1, lat2, lon2) {
  if (
    !Number.isFinite(lat1) ||
    !Number.isFinite(lon1) ||
    !Number.isFinite(lat2) ||
    !Number.isFinite(lon2)
  ) {
    return { distance: '2.8 km', eta: '12 min' };
  }
  const R = 6371; // km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const roadKm = Math.max(0.5, R * c * 1.3);
  const distStr = `${roadKm.toFixed(2)} km`;
  const mins = Math.max(5, Math.round(roadKm * 2.2 + 3));
  return { distance: distStr, eta: `${mins} min` };
}

export const getAvailableOrders = asyncHandler(async (req, res) => {
  // Offline partners must not see orders.
  if (!req.deliveryPartner.isOnline) {
    return ok(res, []);
  }

  const warehouse = getWarehouseLocation();
  const wLat = warehouse?.lat ?? 30.7333;
  const wLng = warehouse?.lng ?? 76.7794;
  const partnerDist = haversineMeters(
    req.deliveryPartner.currentLat,
    req.deliveryPartner.currentLng,
    wLat,
    wLng
  );
  if (!withinRadius(partnerDist, env.delivery.warehouseRadiusMeters)) {
    return ok(res, []); // partner outside 2 km sees nothing
  }

  const { items } = await orderModel.findAll({
    status: 'ready_for_pickup',
    limit: 50,
  });

  const mapped = (items || []).map((order) => {
    const sLat = Number(order.shippingAddress?.lat ?? order.shippingLat);
    const sLng = Number(order.shippingAddress?.lng ?? order.shippingLng);
    const { distance, eta } = computeDistanceAndEta(wLat, wLng, sLat, sLng);

    return {
      id: order.id || order.publicId,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      pickupAddress: warehouse?.address || 'KICKS Main Hub',
      pickupLat: wLat,
      pickupLng: wLng,
      dropoffAddress:
        [order.shippingAddress?.city, order.shippingAddress?.state]
          .filter(Boolean)
          .join(', ') || 'Customer Location',
      shippingAddress: {
        lat: Number.isFinite(sLat) ? sLat : null,
        lng: Number.isFinite(sLng) ? sLng : null,
        city: order.shippingAddress?.city ?? null,
        state: order.shippingAddress?.state ?? null,
        line1: order.shippingAddress?.line1 ?? null,
      },
      itemCount: order.itemCount ?? 1,
      total: order.total,
      payout: Number((Number(order.total || 0) * 0.08).toFixed(2)) || 10,
      distance,
      eta,
      status: 'ready_for_pickup',
    };
  });

  ok(res, mapped);
});

export const acceptOrder = asyncHandler(async (req, res) => {
  const order = await deliveryOrderService.acceptOrder(
    req.params.orderId,
    req.deliveryPartner.publicId
  );
  ok(res, order);
});

export const markPickedUp = asyncHandler(async (req, res) => {
  const w = getWarehouseLocation();
  const wLat = w?.lat ?? 30.7333,
    wLng = w?.lng ?? 76.7794;
  const dist = haversineMeters(
    req.deliveryPartner.currentLat,
    req.deliveryPartner.currentLng,
    wLat,
    wLng
  );
  if (!withinRadius(dist, env.delivery.pickupRadiusMeters)) {
    throw ApiError.forbidden(
      `You must be within ${env.delivery.pickupRadiusMeters} m of the warehouse to mark pick-up.`
    );
  }

  // Changes status: assigned -> shipping
  // This triggers tracking session creation in order.service.js updateStatus()
  const { updateStatus } = await import('../services/order.service.js');
  const order = await updateStatus(req.params.orderId, 'shipping', {
    courier: req.deliveryPartner.fullName,
  });
  ok(res, order);
});

export const markDelivered = asyncHandler(async (req, res) => {
  const order = await orderModel.findByPublicId(req.params.orderId);
  const cLat = order?.shippingLat,
    cLng = order?.shippingLng;
  const dist =
    Number.isFinite(Number(cLat)) && Number.isFinite(Number(cLng))
      ? haversineMeters(
          req.deliveryPartner.currentLat,
          req.deliveryPartner.currentLng,
          Number(cLat),
          Number(cLng)
        )
      : null;
  if (!withinRadius(dist, env.delivery.deliveryRadiusMeters)) {
    throw ApiError.forbidden(
      'You must be within 50 m of the delivery address to mark it delivered.'
    );
  }

  const { updateStatus } = await import('../services/order.service.js');
  const updatedOrder = await updateStatus(req.params.orderId, 'delivered', {});
  ok(res, updatedOrder);
});
