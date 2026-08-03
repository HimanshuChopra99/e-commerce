import { Router } from 'express'
import * as controller from '../controllers/order.controller.js'
import { authenticate, optionalAuth, requireAuth } from '../middlewares/authenticate.js'
import { validate } from '../middlewares/validate.js'
import { checkoutLimiter } from '../middlewares/rate-limit.js'
import {
  createOrderSchema, quoteSchema, idParamSchema,
} from '../validators/order.validator.js'

const router = Router()
 
// Quote and checkout also support guest shoppers. These must be registered
// before /:id so Express never treats `quote` as an order id.
router.post('/quote', optionalAuth, validate(quoteSchema), controller.quote)
router.post('/', checkoutLimiter, optionalAuth, validate(createOrderSchema), controller.create)

// Everything below needs a signed-in customer.
router.get('/', authenticate, requireAuth, controller.listMine)
router.get('/:id', authenticate, requireAuth, validate(idParamSchema, 'params'), controller.getOne)
router.get('/:id/payment-status', authenticate, requireAuth, validate(idParamSchema, 'params'), controller.paymentStatus)
router.post('/:id/pay', authenticate, requireAuth, validate(idParamSchema, 'params'), controller.pay)
router.post('/:id/cancel', authenticate, requireAuth, validate(idParamSchema, 'params'), controller.cancel)

export default router
