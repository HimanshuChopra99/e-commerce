import 'dotenv/config'
import { z } from 'zod'

/**
 * Environment variables, validated once at boot.
 *
 * If something is missing or malformed the process exits immediately with a
 * readable message — far better than a mystery `undefined` at 2am.
 */
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),

  // Comma-separated list of origins allowed to call the API with cookies.
  CORS_ORIGINS: z
    .string()
    .default('http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://localhost:5174'),

  DB_HOST: z.string().default('127.0.0.1'),
  DB_PORT: z.coerce.number().int().default(3306),
  DB_USER: z.string().default('root'),
  DB_PASSWORD: z.string().default(''),
  DB_NAME: z.string().default('Kick'),
  DB_SOCKET: z.string().optional(),
  DB_POOL_SIZE: z.coerce.number().int().min(2).max(200).default(20),

  JWT_ACCESS_SECRET: z.string().min(32).default('default_jwt_access_secret_32_characters_long_for_aistudio'),
  JWT_REFRESH_SECRET: z.string().min(32).default('default_jwt_refresh_secret_32_characters_long_for_aistudio'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL_DAYS: z.coerce.number().int().default(30),

  BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),

  STRIPE_SECRET_KEY: z.string().default(''),
  STRIPE_PUBLISHABLE_KEY: z.string().default(''),
  STRIPE_WEBHOOK_SECRET: z.string().default(''),
  CURRENCY: z.string().length(3).default('USD'),

  // Business rules
  TAX_RATE: z.coerce.number().min(0).max(1).default(0.08),
  FREE_SHIPPING_THRESHOLD: z.coerce.number().min(0).default(150),
  FLAT_SHIPPING_RATE: z.coerce.number().min(0).default(9.99),
  LOW_STOCK_THRESHOLD: z.coerce.number().int().min(0).default(12),
  MAX_QTY_PER_LINE: z.coerce.number().int().min(1).default(10),
  RESERVATION_TTL_MINUTES: z.coerce.number().int().min(5).default(30),

  UPLOAD_DIR: z.string().default('uploads'),
  MAX_UPLOAD_MB: z.coerce.number().int().default(5),

  TRUST_PROXY: z.coerce.number().int().default(1),
})

const parsed = schema.safeParse(process.env)

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('Invalid environment configuration:')
  for (const issue of parsed.error.issues) {
    // eslint-disable-next-line no-console
    console.error(`  ${issue.path.join('.')}: ${issue.message}`)
  }
  process.exit(1)
}

const e = parsed.data

export const env = {
  nodeEnv: e.NODE_ENV,
  isProd: e.NODE_ENV === 'production',
  isTest: e.NODE_ENV === 'test',
  port: e.PORT,
  corsOrigins: e.CORS_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean),
  trustProxy: e.TRUST_PROXY,

  db: {
    host: e.DB_HOST,
    port: e.DB_PORT,
    user: e.DB_USER,
    password: e.DB_PASSWORD,
    database: e.DB_NAME,
    socketPath: e.DB_SOCKET || undefined,
    poolSize: e.DB_POOL_SIZE,
  },

  jwt: {
    accessSecret: e.JWT_ACCESS_SECRET,
    refreshSecret: e.JWT_REFRESH_SECRET,
    accessTtl: e.JWT_ACCESS_TTL,
    refreshTtlDays: e.JWT_REFRESH_TTL_DAYS,
  },

  bcryptRounds: e.BCRYPT_ROUNDS,

  stripe: {
    secretKey: e.STRIPE_SECRET_KEY,
    publishableKey: e.STRIPE_PUBLISHABLE_KEY,
    webhookSecret: e.STRIPE_WEBHOOK_SECRET,
    enabled: Boolean(e.STRIPE_SECRET_KEY),
  },

  currency: e.CURRENCY.toUpperCase(),

  business: {
    taxRate: e.TAX_RATE,
    freeShippingThreshold: e.FREE_SHIPPING_THRESHOLD,
    flatShippingRate: e.FLAT_SHIPPING_RATE,
    lowStockThreshold: e.LOW_STOCK_THRESHOLD,
    maxQtyPerLine: e.MAX_QTY_PER_LINE,
    reservationTtlMinutes: e.RESERVATION_TTL_MINUTES,
  },

  upload: {
    dir: e.UPLOAD_DIR,
    maxBytes: e.MAX_UPLOAD_MB * 1024 * 1024,
  },
}
