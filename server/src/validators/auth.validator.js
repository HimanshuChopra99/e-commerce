import { z } from 'zod'
import { SIZES } from '../utils/constants.js'

/**
 * Passwords: 8+ chars with a lowercase letter and a digit.
 * Mirrors the frontend rules so the two never disagree.
 */
const password = z
  .string()
  .min(8, 'Password must be at least 8 characters.')
  .max(128, 'Password is too long.')
  .regex(/[a-z]/, 'Password must contain a lowercase letter.')
  .regex(/\d/, 'Password must contain a number.')

const email = z.string().trim().toLowerCase().email('Enter a valid email address.').max(160)
const name = z.string().trim().min(1, 'Required.').max(60)
const phone = z.string().trim().max(24).optional().nullable()

export const addressSchema = z.object({
  line1: z.string().trim().min(1, 'Address is required.').max(200),
  line2: z.string().trim().max(200).optional().nullable(),
  city: z.string().trim().min(1, 'City is required.').max(80),
  state: z.string().trim().min(1, 'State is required.').max(80),
  postalCode: z.string().trim().min(1, 'Postal code is required.').max(20),
  country: z.string().trim().min(1, 'Country is required.').max(80),
})

export const registerSchema = z.object({
  firstName: name,
  lastName: name,
  email,
  password,
  phone,
  marketingOptIn: z.boolean().optional().default(false),
})

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required.'),
})

export const updateProfileSchema = z.object({
  firstName: name.optional(),
  lastName: name.optional(),
  phone,
  preferredSize: z.enum(SIZES).optional().nullable(),
  marketingOptIn: z.boolean().optional(),
  address: addressSchema.optional().nullable(),
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Your current password is required.'),
  newPassword: password,
})

export const forgotPasswordSchema = z.object({ email })

export const resetPasswordSchema = z.object({
  token: z.string().min(10, 'Invalid reset token.'),
  newPassword: password,
})

export const verifyEmailSchema = z.object({
  token: z.string().min(10, 'Invalid verification token.'),
})
