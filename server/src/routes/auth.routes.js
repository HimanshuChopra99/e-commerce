import { Router } from 'express'
import * as controller from '../controllers/auth.controller.js'
import { authenticate } from '../middlewares/authenticate.js'
import { validate } from '../middlewares/validate.js'
import {
  loginLimiter, registerLimiter, passwordResetLimiter,
} from '../middlewares/rate-limit.js'
import {
  registerSchema, loginSchema, updateProfileSchema, changePasswordSchema,
  forgotPasswordSchema, resetPasswordSchema, verifyEmailSchema,
} from '../validators/auth.validator.js'

const router = Router()

// ── Public ────────────────────────────────────────────────────────────
router.post('/register', registerLimiter, validate(registerSchema), controller.register)
router.post('/login', loginLimiter, validate(loginSchema), controller.login)
router.post('/refresh', controller.refresh)
router.post('/forgot-password', passwordResetLimiter, validate(forgotPasswordSchema), controller.forgotPassword)
router.post('/reset-password', validate(resetPasswordSchema), controller.resetPassword)
router.post('/verify-email', validate(verifyEmailSchema), controller.verifyEmail)

// ── Signed in ─────────────────────────────────────────────────────────
router.post('/logout', controller.logout)   // works even with an expired access token
router.post('/logout-all', authenticate, controller.logoutAll)
router.get('/me', authenticate, controller.me)
router.patch('/me', authenticate, validate(updateProfileSchema), controller.updateMe)
router.post('/change-password', authenticate, validate(changePasswordSchema), controller.changePassword)

export default router
