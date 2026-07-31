import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { logger } from '../config/logger.js'
import { ApiError } from '../utils/api-error.js'
import { publicId, sha256, randomToken, normalizeEmail } from '../utils/helpers.js'
import * as userModel from '../models/user.model.js'
import * as tokenModel from '../models/auth-token.model.js'

/**
 * Comparing against a real-looking hash when the user doesn't exist keeps the
 * response time constant, so an attacker can't discover which emails are
 * registered by timing the endpoint.
 */
const DUMMY_HASH = bcrypt.hashSync('timing-attack-placeholder', 10)

function signAccessToken(user) {
  return jwt.sign(
    { sub: user.publicId, role: user.role, type: 'access' },
    env.jwt.accessSecret,
    { expiresIn: env.jwt.accessTtl }
  )
}

function signRefreshToken(user) {
  return jwt.sign(
    { sub: user.publicId, type: 'refresh', jti: publicId() },
    env.jwt.refreshSecret,
    { expiresIn: `${env.jwt.refreshTtlDays}d` }
  )
}

async function issueTokens(user, context = {}) {
  const accessToken = signAccessToken(user)
  const refreshToken = signRefreshToken(user)

  const { exp } = jwt.decode(refreshToken)
  await tokenModel.create({
    userId: user.internalId,
    type: 'refresh',
    tokenHash: sha256(refreshToken), // the hash, never the token
    expiresAt: new Date(exp * 1000),
    userAgent: context.userAgent,
    ipAddress: context.ip,
  })

  return { accessToken, refreshToken }
}

export async function register(input, context = {}) {
  const email = normalizeEmail(input.email)

  if (await userModel.emailExists(email)) {
    throw ApiError.conflict('An account with that email already exists.')
  }

  const passwordHash = await bcrypt.hash(input.password, env.bcryptRounds)

  const user = await userModel.create({
    publicId: publicId(),
    role: 'customer', // signup can NEVER create an admin
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    email,
    passwordHash,
    phone: input.phone ?? null,
    marketingOptIn: Boolean(input.marketingOptIn),
  })

  // In production, email this token as a link instead of returning it.
  const verifyToken = randomToken()
  await tokenModel.create({
    userId: user.internalId,
    type: 'email_verify',
    tokenHash: sha256(verifyToken),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  })

  const tokens = await issueTokens(user, context)
  logger.info({ userId: user.publicId }, 'user registered')

  return {
    user: userModel.toPublicUser(user),
    ...tokens,
    ...(env.isProd ? {} : { verifyToken }),
  }
}

export async function login({ email, password }, context = {}) {
  const user = await userModel.findByEmailWithHash(normalizeEmail(email))

  // Always run bcrypt so the timing is identical for unknown emails.
  const matches = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH)

  // One message for both cases — never reveal which emails exist.
  if (!user || !matches) {
    throw ApiError.unauthorized('Invalid email or password.')
  }
  if (user.status === 'blocked') {
    throw ApiError.forbidden('This account has been suspended.')
  }

  await userModel.touchLastLogin(user.internalId)
  const tokens = await issueTokens(user, context)

  logger.info({ userId: user.publicId, role: user.role }, 'user signed in')
  return { user: userModel.toPublicUser(user), ...tokens }
}

/**
 * Rotating refresh: the old token is consumed and a new one issued.
 *
 * If a token verifies but isn't in the table it was already rotated — that
 * means someone is replaying a stolen token, so we revoke every session for
 * that user.
 */
export async function refresh(rawToken, context = {}) {
  if (!rawToken) throw ApiError.unauthorized('No refresh token supplied.')

  let payload
  try {
    payload = jwt.verify(rawToken, env.jwt.refreshSecret)
  } catch {
    throw ApiError.unauthorized('Your session has expired. Please sign in again.')
  }
  if (payload.type !== 'refresh') throw ApiError.unauthorized('Wrong token type.')

  const stored = await tokenModel.findActive(sha256(rawToken), 'refresh')

  if (!stored) {
    const user = await userModel.findByPublicId(payload.sub)
    if (user) {
      await tokenModel.revokeAllForUser(user.internalId, 'refresh')
      logger.warn({ userId: user.publicId }, 'refresh token reuse — all sessions revoked')
    }
    throw ApiError.unauthorized('Session is no longer valid. Please sign in again.')
  }

  const user = await userModel.findByPublicId(payload.sub)
  if (!user) throw ApiError.unauthorized('Account no longer exists.')
  if (user.status === 'blocked') throw ApiError.forbidden('This account has been suspended.')

  await tokenModel.consume(stored.id)
  const tokens = await issueTokens(user, context)
  return { user: userModel.toPublicUser(user), ...tokens }
}

export async function logout(rawToken) {
  if (!rawToken) return
  const stored = await tokenModel.findActive(sha256(rawToken), 'refresh')
  if (stored) await tokenModel.consume(stored.id)
}

export async function logoutAll(userId) {
  await tokenModel.revokeAllForUser(userId, 'refresh')
}

export async function getProfile(userId) {
  const user = await userModel.findById(userId)
  if (!user) throw ApiError.notFound('Account not found.')

  if (user.role === 'customer') {
    const stats = await userModel.getCustomerStats(userId)
    return { ...userModel.toPublicUser(user), ...stats }
  }
  return userModel.toPublicUser(user)
}

export async function updateProfile(userId, patch) {
  const user = await userModel.update(userId, patch)
  return userModel.toPublicUser(user)
}

export async function changePassword(userId, { currentPassword, newPassword }) {
  const user = await userModel.findByIdWithHash(userId)
  if (!user) throw ApiError.notFound('Account not found.')

  const matches = await bcrypt.compare(currentPassword, user.passwordHash)
  if (!matches) throw ApiError.badRequest('Your current password is incorrect.')

  if (await bcrypt.compare(newPassword, user.passwordHash)) {
    throw ApiError.badRequest('Your new password must be different.')
  }

  await userModel.updatePassword(userId, await bcrypt.hash(newPassword, env.bcryptRounds))

  // Force every other device to sign in again.
  await tokenModel.revokeAllForUser(userId, 'refresh')
  logger.info({ userId: user.publicId }, 'password changed')
}

/**
 * Always resolves, even for an unknown email — otherwise this endpoint
 * becomes a way to enumerate your customer list.
 */
export async function requestPasswordReset(email) {
  const user = await userModel.findByEmail(normalizeEmail(email))
  if (!user) return { sent: true }

  const token = randomToken()
  await tokenModel.create({
    userId: user.internalId,
    type: 'password_reset',
    tokenHash: sha256(token),
    expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
  })

  logger.info({ userId: user.publicId }, 'password reset requested')
  // TODO: email the link. Returned outside production for local testing.
  return { sent: true, ...(env.isProd ? {} : { resetToken: token }) }
}

export async function resetPassword({ token, newPassword }) {
  const stored = await tokenModel.findActive(sha256(token), 'password_reset')
  if (!stored) throw ApiError.badRequest('This reset link is invalid or has expired.')

  await userModel.updatePassword(
    stored.userId,
    await bcrypt.hash(newPassword, env.bcryptRounds)
  )
  await tokenModel.consume(stored.id)

  // Evict anyone already holding a session for this account.
  await tokenModel.revokeAllForUser(stored.userId, 'refresh')
  logger.info({ userId: stored.userId }, 'password reset completed')
}

export async function verifyEmail(token) {
  const stored = await tokenModel.findActive(sha256(token), 'email_verify')
  if (!stored) throw ApiError.badRequest('This verification link is invalid or has expired.')

  await userModel.markEmailVerified(stored.userId)
  await tokenModel.consume(stored.id)
}
