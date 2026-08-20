import { asyncHandler } from '../utils/async-handler.js'
import { ok, created } from '../utils/api-response.js'
import * as dpService from '../services/delivery-partner.service.js'
import * as deliveryOrderService from '../services/delivery-order.service.js'
import * as dpModel from '../models/delivery-partner.model.js'

import * as orderModel from '../models/order.model.js'
import { getWarehouseLocation } from '../config/socket.js'

export const register = asyncHandler(async (req, res) => {
  const result = await dpService.register(req.body)
  created(res, result)
})

export const login = asyncHandler(async (req, res) => {
  const result = await dpService.login(req.body)
  ok(res, result)
})

export const me = asyncHandler(async (req, res) => {
  const partner = await dpModel.findByPublicId(req.deliveryPartner.publicId)
  ok(res, partner)
})

function computeDistanceAndEta(lat1, lon1, lat2, lon2) {
  if (!Number.isFinite(lat1) || !Number.isFinite(lon1) || !Number.isFinite(lat2) || !Number.isFinite(lon2)) {
    return { distance: '2.8 km', eta: '12 min' }
  }
  const R = 6371 // km
  const dLat = (lat2 - lat1) * (Math.PI / 180)
  const dLon = (lon2 - lon1) * (Math.PI / 180)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const roadKm = Math.max(0.5, R * c * 1.3)
  const distStr = roadKm < 1 ? `${Math.round(roadKm * 1000)} m` : `${roadKm.toFixed(1)} km`
  const mins = Math.max(5, Math.round(roadKm * 2.2 + 3))
  return { distance: distStr, eta: `${mins} min` }
}

export const getAvailableOrders = asyncHandler(async (req, res) => {
  const { items } = await orderModel.findAll({ status: 'ready_for_pickup', limit: 50 })
  const warehouse = getWarehouseLocation()
  const wLat = warehouse?.lat ?? 30.7333
  const wLng = warehouse?.lng ?? 76.7794

  const mapped = (items || []).map((order) => {
    const sLat = Number(order.shippingAddress?.lat ?? order.shippingLat)
    const sLng = Number(order.shippingAddress?.lng ?? order.shippingLng)
    const { distance, eta } = computeDistanceAndEta(wLat, wLng, sLat, sLng)

    return {
      id: order.id || order.publicId,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      pickupAddress: warehouse?.address || 'KICKS Main Hub',
      pickupLat: wLat,
      pickupLng: wLng,
      dropoffAddress: [
        order.shippingAddress?.city,
        order.shippingAddress?.state,
      ].filter(Boolean).join(', ') || 'Customer Location',
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
    }
  })

  ok(res, mapped)
})

export const acceptOrder = asyncHandler(async (req, res) => {
  const order = await deliveryOrderService.acceptOrder(
    req.params.orderId,
    req.deliveryPartner.publicId
  )
  ok(res, order)
})

export const markPickedUp = asyncHandler(async (req, res) => {
  // Changes status: assigned -> shipping
  // This triggers tracking session creation in order.service.js updateStatus()
  const { updateStatus } = await import('../services/order.service.js')
  const order = await updateStatus(req.params.orderId, 'shipping', {
    courier: req.deliveryPartner.fullName,
  })
  ok(res, order)
})

export const markDelivered = asyncHandler(async (req, res) => {
  const { updateStatus } = await import('../services/order.service.js')
  const order = await updateStatus(req.params.orderId, 'delivered', {})
  ok(res, order)
})
