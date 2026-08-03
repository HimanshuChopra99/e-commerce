import { Router } from 'express'
import { pool } from '../config/database.js'
import { env } from '../config/env.js'
import authRoutes from './auth.routes.js'
import productRoutes from './product.routes.js'
import categoryRoutes from './category.routes.js'
import orderRoutes from './order.routes.js'
import adminRoutes from './admin/index.js'

const router = Router()

/**
 * GET /api/health
 *
 * Used by the load balancer and uptime monitoring. Pings the database so a
 * broken DB connection takes the instance out of rotation.
 */
router.get('/health', async (_req, res) => {
  let database = 'down'
  try {
    const conn = await pool.getConnection()
    try {
      await conn.ping()
      database = 'up'
    } finally {
      conn.release()
    }
  } catch {
    database = 'fallback'
  }

  // This endpoint is a readiness check, not just a process liveness check.
  // Returning 200 while the database is unavailable keeps a broken instance
  // in a load balancer and can lead to false checkout success/fallback data.
  // Local/demo mode intentionally supports the in-memory catalogue; production
  // must never advertise a database-fallback process as ready.
  const healthy = database === 'up' || !env.isProd
  res.status(healthy ? 200 : 503).json({
    success: healthy,
    data: {
      status: healthy ? 'ok' : 'unavailable',
      database,
      stripe: env.stripe.enabled ? 'configured' : 'disabled',
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    },
  })
})

// ── Storefront ────────────────────────────────────────────────────────
router.use('/auth', authRoutes)
router.use('/products', productRoutes)
router.use('/categories', categoryRoutes)
router.use('/orders', orderRoutes)

// ── Admin (guarded inside admin/index.js) ─────────────────────────────
router.use('/admin', adminRoutes)

export default router
