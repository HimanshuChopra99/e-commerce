import { pool } from '../config/database.js';
import { ApiError } from '../utils/api-error.js';
import { logger } from '../config/logger.js';
import { getIO } from '../config/socket.js';
import * as orderModel from '../models/order.model.js';
import * as dpModel from '../models/delivery-partner.model.js';

/**
 * Atomically assigns an order to the first delivery partner who accepts.
 * Uses a single UPDATE with WHERE status = 'ready_for_pickup' so only
 * one partner can ever win the race — affectedRows = 0 means someone else got it.
 */
export async function acceptOrder(orderPublicId, partnerPublicId) {
  // Resolve internal IDs
  const [orderRow] = await pool.query(
    'SELECT id, status, order_number, tracking_number FROM orders WHERE public_id = ? LIMIT 1',
    [orderPublicId]
  );
  if (!orderRow || !orderRow[0]) throw ApiError.notFound('Order not found.');
  const order = orderRow[0];

  const partner = await dpModel.findByPublicId(partnerPublicId);
  if (!partner) throw ApiError.notFound('Delivery partner not found.');

  // Only online partners may accept orders.
  if (!partner.isOnline) {
    throw ApiError.forbidden('You must be online to accept orders.');
  }

  // THE RACE CONDITION GUARD — atomic compare-and-swap
  const [result] = await pool.query(
    `UPDATE orders
     SET status = 'assigned', delivery_partner_id = ?, updated_at = NOW()
     WHERE id = ? AND status = 'ready_for_pickup'`,
    [partner.internalId, order.id]
  );

  if (result.affectedRows === 0) {
    throw ApiError.conflict(
      'This order has already been taken by another delivery partner.'
    );
  }

  logger.info(
    { orderPublicId, partnerPublicId },
    'Order assigned to delivery partner'
  );

  const io = getIO();
  if (io) {
    // Tell ALL partners in the pool this order is gone
    io.to('delivery:pool').emit('order:assigned_away', {
      orderId: orderPublicId,
    });
    // Tell admin the status changed
    io.to('admin_room').emit('order:status_changed', {
      orderId: orderPublicId,
      status: 'assigned',
      partnerName: partner.fullName,
    });
  }

  return orderModel.findByPublicId(orderPublicId);
}
