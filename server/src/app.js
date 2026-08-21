import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import cookieParser from 'cookie-parser'
import { env } from './config/env.js'
import routes from './routes/index.js'
import webhookRoutes from './routes/webhook.routes.js'
import { errorHandler, notFound } from './middlewares/error-handler.js'
import { requestContext } from './middlewares/request-context.js'
import { globalLimiter } from './middlewares/rate-limit.js'
import { UPLOAD_DIR } from './middlewares/upload.js'

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

export function createApp() {
  const app = express()

  // Behind a load balancer, req.ip must come from X-Forwarded-For or every
  // rate limit would key on the proxy's address.
  app.set('trust proxy', env.trustProxy)
  app.disable('x-powered-by')

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))
  app.use(compression())
  app.use(requestContext)

  app.use(
    cors({
      origin(origin, callback) {
        // No Origin header = curl, server-to-server, mobile app.
        if (!origin) return callback(null, true)
        if (!env.isProd) return callback(null, true)
        if (env.corsOrigins.includes(origin)) return callback(null, true)
        callback(new Error('NOT_ALLOWED_BY_CORS'))
      },
      credentials: true, // required for the refresh cookie
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
      exposedHeaders: ['X-Request-Id'],
      maxAge: 86400,
    })
  )

  /**
   * ⚠️ ORDER MATTERS
   *
   * Stripe signature verification hashes the exact bytes it sent. If
   * express.json() parses the body first, those bytes change and every
   * webhook fails. So the webhook is mounted with a raw parser BEFORE the
   * JSON parser below.
   */
  app.use('/api/webhooks', express.raw({ type: 'application/json', limit: '1mb' }), webhookRoutes)

  app.use(express.json({ limit: '1mb' }))
  app.use(express.urlencoded({ extended: true, limit: '1mb' }))
  app.use(cookieParser())

  // Product images. In production put these behind a CDN instead.
  app.use(
    '/uploads',
    express.static(UPLOAD_DIR, {
      maxAge: '7d',
      etag: true,
      index: false,
      dotfiles: 'deny',
    })
  )

  // API root endpoint
  app.get('/api', (_req, res) =>
    res.json({ success: true, data: { name: 'Kick API', version: '1.0.0' } })
  )

  app.use('/api', globalLimiter, routes)

  // API requests must receive JSON 404s, never the storefront SPA shell.
  app.use('/api', notFound)

  // Root endpoint for API clients (JSON content-type/accept)
  app.get('/', (req, res, next) => {
    const isJson =
      req.headers['content-type']?.includes('application/json') ||
      req.headers.accept?.includes('application/json')
    const isHtml =
      req.headers.accept?.includes('text/html') ||
      req.headers['sec-fetch-dest'] === 'document'

    if (isJson && !isHtml) {
      return res.json({ success: true, data: { name: 'Kick API', version: '1.0.0' } })
    }
    next()
  })

  // Serve admin static build if present
  const adminDist = path.join(PROJECT_ROOT, 'admin/dist')
  if (fs.existsSync(adminDist)) {
    app.use('/admin', express.static(adminDist))
    // Explicit catch-all for admin SPA routes BEFORE the client wildcard
    app.get(['/admin', '/admin/*path'], (_req, res) =>
      res.sendFile(path.join(adminDist, 'index.html'))
    )
  }

  // Serve client static build if present — AFTER admin routes
  const clientDist = path.join(PROJECT_ROOT, 'client/dist')
  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist))
    app.get('*path', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')))
  } else {
    app.get('/', (_req, res) =>
      res.json({ success: true, data: { name: 'Kick API', version: '1.0.0' } })
    )
    app.use(notFound)
  }

  app.use(errorHandler)

  return app
}
