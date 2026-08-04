import { z } from 'zod'

const publicId = z.string().trim().min(1).max(64)
const cartItem = z.object({
  variantId: publicId,
  quantity: z.coerce.number().int().min(1).max(10),
})

export const cartItemSchema = cartItem
export const cartSyncSchema = z.object({
  items: z.array(cartItem).max(50).default([]),
})
export const variantParamSchema = z.object({ variantId: publicId })
export const productParamSchema = z.object({ productId: publicId })
export const favouriteSyncSchema = z.object({
  productIds: z.array(publicId).max(100).default([]),
})
