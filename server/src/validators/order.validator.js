import { z } from 'zod';
import {
  ORDER_STATUS,
  PAYMENT_STATUS,
  PAYMENT_METHODS,
  COURIERS,
} from '../utils/constants.js';
import { addressSchema } from './auth.validator.js';

const csvArray = (values) =>
  z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((v) => {
      if (v === undefined) return undefined;
      const list = Array.isArray(v) ? v : String(v).split(',');
      return list.map((s) => s.trim()).filter((s) => values.includes(s));
    })
    .transform((v) => (v && v.length ? v : undefined));

const cartItem = z.object({
  variantId: z.string().trim().min(1, 'A product variant is required.'),
  quantity: z.coerce
    .number()
    .int()
    .min(1, 'Quantity must be at least 1.')
    .max(10),
});

/** Prices a cart without creating anything. */
export const quoteSchema = z.object({
  items: z.array(cartItem).min(1, 'Your cart is empty.').max(50),
});

/**
 * Checkout.
 *
 * Note there is no `price` or `total` field — the client cannot influence
 * what it is charged. Only variant ids and quantities are accepted.
 */
export const createOrderSchema = z.object({
  items: z.array(cartItem).min(1, 'Your cart is empty.').max(50),
  shippingAddress: addressSchema.extend({
    name: z.string().trim().min(1, 'Recipient name is required.').max(120),
    phone: z.string().trim().max(24).optional().nullable(),
  }),
  paymentMethod: z.enum(PAYMENT_METHODS).default('card'),
  // Required for guest checkout; ignored when signed in.
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Enter a valid email address.')
    .optional(),
  customerName: z.string().trim().max(140).optional(),
  customerPhone: z.string().trim().max(24).optional(),
  customerNote: z.string().trim().max(1000).optional().nullable(),
});

export const orderQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: csvArray(ORDER_STATUS),
  paymentStatus: csvArray(PAYMENT_STATUS),
  paymentMethod: csvArray(PAYMENT_METHODS),
  q: z.string().trim().max(120).optional(),
  dateFrom: z.string().datetime().optional().or(z.string().date().optional()),
  dateTo: z.string().datetime().optional().or(z.string().date().optional()),
  minTotal: z.coerce.number().min(0).optional(),
  maxTotal: z.coerce.number().min(0).optional(),
  sort: z
    .enum(['newest', 'oldest', 'total_desc', 'total_asc'])
    .default('newest'),
});

export const updateOrderStatusSchema = z
  .object({
    status: z.enum(ORDER_STATUS),
    courier: z.enum(COURIERS).optional().nullable(),
    trackingNumber: z.string().trim().max(80).optional().nullable(),
    adminNote: z.string().trim().max(2000).optional().nullable(),
  })
  .refine(() => true);

export const updateTrackingSchema = z.object({
  courier: z.enum(COURIERS),
  trackingNumber: z
    .string()
    .trim()
    .min(3, 'Tracking number is required.')
    .max(80),
});

export const updateNoteSchema = z.object({
  adminNote: z.string().trim().max(2000),
});

export const refundSchema = z.object({
  amount: z.coerce.number().positive().optional(),
  reason: z
    .enum(['duplicate', 'fraudulent', 'requested_by_customer'])
    .optional(),
  restock: z.boolean().default(false),
});

/* ------------------------------ Customers ------------------------------ */

export const customerQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().max(120).optional(),
  status: z.enum(['active', 'blocked']).optional(),
  tier: z.enum(['bronze', 'silver', 'gold', 'platinum']).optional(),
  sort: z
    .enum([
      'created_desc',
      'created_asc',
      'spent_desc',
      'spent_asc',
      'orders_desc',
      'name_asc',
    ])
    .default('created_desc'),
});

export const updateCustomerSchema = z.object({
  firstName: z.string().trim().min(1).max(60).optional(),
  lastName: z.string().trim().min(1).max(60).optional(),
  phone: z.string().trim().max(24).nullable().optional(),
  notes: z.string().trim().max(5000).nullable().optional(),
  marketingOptIn: z.boolean().optional(),
});

export const updateCustomerStatusSchema = z.object({
  status: z.enum(['active', 'blocked']),
});

/* --------------------------- Delivery partners --------------------------- */

const VEHICLE_TYPES = ['bike', 'scooter', 'car'];

export const deliveryPartnerQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().max(120).optional(),
  status: z.enum(['active', 'blocked']).optional(),
  vehicleType: z.enum(VEHICLE_TYPES).optional(),
  sort: z
    .enum(['created_desc', 'created_asc', 'name_asc'])
    .default('created_desc'),
});

export const createDeliveryPartnerSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required.').max(60),
  lastName: z.string().trim().min(1, 'Last name is required.').max(60),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Enter a valid email address.')
    .max(160),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters.')
    .max(72),
  phone: z.string().trim().max(24).optional().nullable(),
  vehicleType: z.enum(VEHICLE_TYPES).default('bike'),
});

export const updateDeliveryPartnerSchema = z.object({
  firstName: z.string().trim().min(1).max(60).optional(),
  lastName: z.string().trim().min(1).max(60).optional(),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Enter a valid email address.')
    .max(160)
    .optional(),
  phone: z.string().trim().max(24).nullable().optional(),
  vehicleType: z.enum(VEHICLE_TYPES).optional(),
  status: z.enum(['active', 'blocked']).optional(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters.')
    .max(72)
    .optional(),
});

export const updateDeliveryPartnerStatusSchema = z.object({
  status: z.enum(['active', 'blocked']),
});

/** Reusable :param validator. */
export const idParamSchema = z.object({
  id: z.string().trim().min(1, 'Missing id.').max(64),
});

export const slugParamSchema = z.object({
  slug: z.string().trim().min(1, 'Missing slug.').max(220),
});
