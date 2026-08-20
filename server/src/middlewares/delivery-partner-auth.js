import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { ApiError } from '../utils/api-error.js'
import { DELIVERY_PARTNER_ROLE } from '../utils/constants.js'
import * as dpModel from '../models/delivery-partner.model.js'

export async function authenticateDeliveryPartner(req, _res, next) {
  try {
    const header = req.headers.authorization ?? ''
    if (!header.startsWith('Bearer ')) {
      req.deliveryPartner = null
      return next()
    }
    const token = header.slice(7).trim()
    let payload
    try {
      payload = jwt.verify(token, env.jwt.accessSecret)
    } catch {
      req.deliveryPartner = null
      return next()
    }
    if (!payload || payload.type !== 'access' || payload.role !== DELIVERY_PARTNER_ROLE) {
      req.deliveryPartner = null
      return next()
    }
    const partner = await dpModel.findByPublicId(payload.sub)
    if (!partner || partner.status === 'blocked') {
      req.deliveryPartner = null
      return next()
    }
    req.deliveryPartner = partner
    next()
  } catch (err) {
    next(err)
  }
}

export function requireDeliveryPartner(req, _res, next) {
  if (!req.deliveryPartner) {
    return next(ApiError.unauthorized('Delivery partner authentication required.'))
  }
  next()
}
