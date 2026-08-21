import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { ApiError } from '../utils/api-error.js'
import { normalizeEmail } from '../utils/helpers.js'
import * as dpModel from '../models/delivery-partner.model.js'
import { DELIVERY_PARTNER_ROLE } from '../utils/constants.js'

function signAccessToken(partner) {
  return jwt.sign(
    { sub: partner.publicId, role: DELIVERY_PARTNER_ROLE, type: 'access' },
    env.jwt.accessSecret,
    { expiresIn: env.jwt.accessTtl }
  )
}

export async function register({ firstName, lastName, email, password, phone, vehicleType }) {
  const normalEmail = normalizeEmail(email)
  if (await dpModel.emailExists(normalEmail)) {
    throw ApiError.conflict('An account with that email already exists.')
  }
  const passwordHash = await bcrypt.hash(password, env.bcryptRounds ?? 12)
  const partner = await dpModel.create({ firstName, lastName, email: normalEmail, passwordHash, phone, vehicleType })
  const accessToken = signAccessToken(partner)
  return { partner, accessToken }
}

/**
 * Admin-facing create: registers a partner account without issuing a JWT.
 * Hashes the password and enforces email uniqueness, mirroring `register`.
 */
export async function createPartner({ firstName, lastName, email, password, phone, vehicleType }) {
  const normalEmail = normalizeEmail(email)
  if (await dpModel.emailExists(normalEmail)) {
    throw ApiError.conflict('A delivery partner with that email already exists.')
  }
  const passwordHash = await bcrypt.hash(password, env.bcryptRounds ?? 12)
  return dpModel.create({
    firstName,
    lastName,
    email: normalEmail,
    passwordHash,
    phone,
    vehicleType,
  })
}

export async function login({ email, password }) {
  const normalEmail = normalizeEmail(email)
  const partner = await dpModel.findByEmail(normalEmail)
  if (!partner) throw ApiError.unauthorized('Invalid email or password.')
  const valid = await bcrypt.compare(password, partner.passwordHash)
  if (!valid) throw ApiError.unauthorized('Invalid email or password.')
  if (partner.status === 'blocked') throw ApiError.forbidden('This account has been suspended.')
  const { passwordHash: _, ...safePartner } = partner
  const accessToken = signAccessToken(safePartner)
  return { partner: safePartner, accessToken }
}
