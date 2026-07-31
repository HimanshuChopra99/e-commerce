import { asyncHandler } from '../utils/async-handler.js'
import { ok, created } from '../utils/api-response.js'
import { env } from '../config/env.js'
import * as authService from '../services/auth.service.js'

const COOKIE = 'refreshToken'

/**
 * The refresh token goes in an httpOnly cookie so JavaScript cannot read it —
 * an XSS bug then can't steal a 30-day session.
 *
 * `path` scopes it to the auth routes, so it isn't sent on every API call.
 */
const cookieOptions = {
  httpOnly: true,
  secure: env.isProd,
  sameSite: env.isProd ? 'strict' : 'lax',
  path: '/api/auth',
  maxAge: env.jwt.refreshTtlDays * 24 * 60 * 60 * 1000,
}

const context = (req) => ({ userAgent: req.get('user-agent'), ip: req.ip })

export const register = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken, verifyToken } =
    await authService.register(req.body, context(req))

  res.cookie(COOKIE, refreshToken, cookieOptions)
  created(res, { user, accessToken, ...(verifyToken ? { verifyToken } : {}) })
})

export const login = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken } = await authService.login(req.body, context(req))
  res.cookie(COOKIE, refreshToken, cookieOptions)
  ok(res, { user, accessToken })
})

export const refresh = asyncHandler(async (req, res) => {
  // Accept the cookie, or a body field for non-browser clients.
  const token = req.cookies?.[COOKIE] ?? req.body?.refreshToken
  const { user, accessToken, refreshToken } = await authService.refresh(token, context(req))
  res.cookie(COOKIE, refreshToken, cookieOptions)
  ok(res, { user, accessToken })
})

export const logout = asyncHandler(async (req, res) => {
  await authService.logout(req.cookies?.[COOKIE] ?? req.body?.refreshToken)
  res.clearCookie(COOKIE, { ...cookieOptions, maxAge: undefined })
  ok(res, { message: 'Signed out.' })
})

export const logoutAll = asyncHandler(async (req, res) => {
  await authService.logoutAll(req.user.id)
  res.clearCookie(COOKIE, { ...cookieOptions, maxAge: undefined })
  ok(res, { message: 'Signed out of all devices.' })
})

export const me = asyncHandler(async (req, res) => {
  ok(res, await authService.getProfile(req.user.id))
})

export const updateMe = asyncHandler(async (req, res) => {
  ok(res, await authService.updateProfile(req.user.id, req.body))
})

export const changePassword = asyncHandler(async (req, res) => {
  await authService.changePassword(req.user.id, req.body)
  res.clearCookie(COOKIE, { ...cookieOptions, maxAge: undefined })
  ok(res, { message: 'Password changed. Please sign in again.' })
})

export const forgotPassword = asyncHandler(async (req, res) => {
  const result = await authService.requestPasswordReset(req.body.email)
  // Always the same response, so this can't be used to discover which
  // email addresses have accounts.
  ok(res, {
    message: 'If an account exists for that email, a reset link is on its way.',
    ...(result.resetToken ? { resetToken: result.resetToken } : {}),
  })
})

export const resetPassword = asyncHandler(async (req, res) => {
  await authService.resetPassword(req.body)
  ok(res, { message: 'Password updated. You can now sign in.' })
})

export const verifyEmail = asyncHandler(async (req, res) => {
  await authService.verifyEmail(req.body.token)
  ok(res, { message: 'Email verified.' })
})
