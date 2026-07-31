import { randomUUID } from 'node:crypto'
import { logger } from '../config/logger.js'
import { env } from '../config/env.js'

/**
 * Gives every request an id and logs how it finished.
 *
 * The id is echoed back in the `X-Request-Id` header, so when a customer
 * reports a problem you can find the exact request in your logs.
 */
export function requestContext(req, res, next) {
  req.id = req.headers['x-request-id'] || randomUUID()
  res.setHeader('X-Request-Id', req.id)

  const startedAt = process.hrtime.bigint()

  res.on('finish', () => {
    // Health checks would drown out everything useful.
    if (req.path === '/api/health') return

    const ms = Number(process.hrtime.bigint() - startedAt) / 1e6
    const context = {
      requestId: req.id,
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      ms: Math.round(ms),
      userId: req.user?.publicId,
    }

    if (res.statusCode >= 500) logger.error(context, 'request failed')
    else if (res.statusCode >= 400) logger.warn(context, 'request rejected')
    else if (!env.isProd || ms > 1000) logger.info(context, 'request')
  })

  next()
}
