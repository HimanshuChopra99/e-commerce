import { z } from 'zod'

export const trackingParamSchema = z.object({
  trackingNumber: z.string().trim().min(3, 'Tracking number is required.').max(80)
    .regex(/^[A-Za-z0-9_-]+$/, 'Tracking number contains invalid characters.'),
})

export const pingSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
})