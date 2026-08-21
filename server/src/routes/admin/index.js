import { Router } from 'express'
import { authenticate, requireAdmin } from '../../middlewares/authenticate.js'
import dashboardRoutes from './dashboard.routes.js'
import productRoutes from './product.routes.js'
import categoryRoutes from './category.routes.js'
import orderRoutes from './order.routes.js'
import customerRoutes from './customer.routes.js'
import deliveryPartnerRoutes from './delivery-partner.routes.js'

const router = Router()

/**
 * Guard once, here, rather than on each route.
 *
 * This means a newly added admin endpoint is protected by default —
 * forgetting a guard is the most common way admin data leaks.
 *
 * IMPORTANT: All admin routes require valid authentication AND admin role.
 * Without a valid JWT token, requests will be rejected with 401.
 */
router.use(authenticate, requireAdmin)

router.use('/dashboard', dashboardRoutes)
router.use('/products', productRoutes)
router.use('/categories', categoryRoutes)
router.use('/orders', orderRoutes)
router.use('/customers', customerRoutes)
router.use('/delivery-partners', deliveryPartnerRoutes)

export default router
