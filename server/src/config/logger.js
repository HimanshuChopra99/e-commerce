import { env } from './env.js'

/**
 * Tiny structured logger — zero dependencies.
 *
 * Production emits one JSON object per line, which every log aggregator
 * (CloudWatch, Loki, Datadog) parses natively. Development prints something
 * a human can read.
 */
const LEVELS = { debug: 10, info: 20, warn: 30, error: 40, fatal: 50 }
const MIN_LEVEL = LEVELS[env.isProd ? 'info' : 'debug']

/** Keys whose values must never reach the logs. */
const REDACT = new Set([
  'password',
  'currentPassword',
  'newPassword',
  'passwordHash',
  'password_hash',
  'token',
  'accessToken',
  'refreshToken',
  'authorization',
  'cookie',
  'stripeSecretKey',
])

function sanitize(value, depth = 0) {
  if (depth > 6 || value === null || typeof value !== 'object') return value
  if (value instanceof Error) {
    return { name: value.name, message: value.message, code: value.code, stack: value.stack }
  }
  if (Array.isArray(value)) return value.slice(0, 50).map((v) => sanitize(v, depth + 1))

  const out = {}
  for (const [k, v] of Object.entries(value)) {
    out[k] = REDACT.has(k) ? '[redacted]' : sanitize(v, depth + 1)
  }
  return out
}

function emit(level, context, message) {
  if (LEVELS[level] < MIN_LEVEL) return

  // Allow logger.info('msg') as well as logger.info({ ... }, 'msg')
  if (typeof context === 'string') {
    message = context
    context = {}
  }

  const payload = { level, time: new Date().toISOString(), msg: message, ...sanitize(context) }
  const line = env.isProd
    ? JSON.stringify(payload)
    : `${payload.time} ${level.toUpperCase().padEnd(5)} ${message}` +
      (Object.keys(context ?? {}).length
        ? ` ${JSON.stringify(sanitize(context))}`
        : '')

  if (level === 'error' || level === 'fatal') process.stderr.write(line + '\n')
  else process.stdout.write(line + '\n')
}

export const logger = {
  debug: (ctx, msg) => emit('debug', ctx, msg),
  info: (ctx, msg) => emit('info', ctx, msg),
  warn: (ctx, msg) => emit('warn', ctx, msg),
  error: (ctx, msg) => emit('error', ctx, msg),
  fatal: (ctx, msg) => emit('fatal', ctx, msg),
}
