import 'dotenv/config'
import { z } from 'zod'

const DEFAULT_ACCESS_SECRET = 'default_jwt_access_secret_32_characters_long_for_aistudio'
const DEFAULT_REFRESH_SECRET = 'default_jwt_refresh_secret_32_characters_long_for_aistudio'

/**
 * Environment variables, validated once at boot.
 *
 * If something is missing or malformed the process exits immediately with a
 * readable message — far better than a mystery `undefined` at 2am.
 */
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),

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

  JWT_ACCESS_SECRET: z.string().min(32).default(DEFAULT_ACCESS_SECRET),
  JWT_REFRESH_SECRET: z.string().min(32).default(DEFAULT_REFRESH_SECRET),
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
  AUTO_SEED: z.string().optional(),
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

// Validate JWT secrets in production
const isProduction = e.NODE_ENV === 'production'
const usingDefaultAccess = e.JWT_ACCESS_SECRET === DEFAULT_ACCESS_SECRET
const usingDefaultRefresh = e.JWT_REFRESH_SECRET === DEFAULT_REFRESH_SECRET

if (isProduction && (usingDefaultAccess || usingDefaultRefresh)) {
  // eslint-disable-next-line no-console
  console.error('FATAL: Production environment must not use default JWT secrets.')
  // eslint-disable-next-line no-console
  console.error('Set JWT_ACCESS_SECRET and JWT_REFRESH_SECRET to unique, secure values.')
  process.exit(1)
}

// Warn in non-production
if ((usingDefaultAccess || usingDefaultRefresh) && !isProduction) {
  // eslint-disable-next-line no-console
  console.warn('WARNING: Using default JWT secrets in non-production. Set secure secrets for production.')
}

const eFinal = parsed.data

export const env = {
  nodeEnv: eFinal.NODE_ENV,
  isProd: eFinal.NODE_ENV === 'production',
  isTest: eFinal.NODE_ENV === 'test',
  port: eFinal.PORT,
  corsOrigins: eFinal.CORS_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean),
  trustProxy: eFinal.TRUST_PROXY,
  // Seed demo data automatically only for local development unless explicitly enabled.
  autoSeed: eFinal.AUTO_SEED === 'true' || (eFinal.AUTO_SEED !== 'false' && eFinal.NODE_ENV === 'development'),

  db: {
    host: eFinal.DB_HOST,
    port: eFinal.DB_PORT,
    user: eFinal.DB_USER,
    password: eFinal.DB_PASSWORD,
    database: eFinal.DB_NAME,
    socketPath: eFinal.DB_SOCKET || undefined,
    poolSize: eFinal.DB_POOL_SIZE,
  },

  jwt: {
    accessSecret: eFinal.JWT_ACCESS_SECRET,
    refreshSecret: eFinal.JWT_REFRESH_SECRET,
    accessTtl: eFinal.JWT_ACCESS_TTL,
    refreshTtlDays: eFinal.JWT_REFRESH_TTL_DAYS,
  },

  bcryptRounds: eFinal.BCRYPT_ROUNDS,

  stripe: {
    secretKey: eFinal.STRIPE_SECRET_KEY,
    publishableKey: eFinal.STRIPE_PUBLISHABLE_KEY,
    webhookSecret: eFinal.STRIPE_WEBHOOK_SECRET,
    enabled: Boolean(eFinal.STRIPE_SECRET_KEY),
  },

  currency: eFinal.CURRENCY.toUpperCase(),

  business: {
    taxRate: eFinal.TAX_RATE,
    freeShippingThreshold: eFinal.FREE_SHIPPING_THRESHOLD,
    flatShippingRate: eFinal.FLAT_SHIPPING_RATE,
    lowStockThreshold: eFinal.LOW_STOCK_THRESHOLD,
    maxQtyPerLine: eFinal.MAX_QTY_PER_LINE,
    reservationTtlMinutes: eFinal.RESERVATION_TTL_MINUTES,
  },

  upload: {
    dir: eFinal.UPLOAD_DIR,
    maxBytes: eFinal.MAX_UPLOAD_MB * 1024 * 1024,
  },
}
