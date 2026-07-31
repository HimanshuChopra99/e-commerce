import { Router } from 'express'
import * as controller from '../../controllers/admin/dashboard.controller.js'

const router = Router()

router.get('/overview', controller.overview)
router.get('/stats', controller.stats)
router.get('/revenue', controller.revenue)
router.get('/daily', controller.daily)
router.get('/revenue-by-category', controller.revenueByCategory)
router.get('/sales-by-size', controller.salesBySize)
router.get('/orders-by-status', controller.ordersByStatus)
router.get('/recent-orders', controller.recentOrders)
router.get('/top-products', controller.topProducts)
router.get('/low-stock', controller.lowStock)

export default router
