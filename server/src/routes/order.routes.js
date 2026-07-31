import { Router } from 'express'
import * as controller from '../controllers/order.controller.js'
import { authenticate, optionalAuth } from '../middlewares/authenticate.js'
import { validate } from '../middlewares/validate.js'
import { checkoutLimiter } from '../middlewares/rate-limit.js'
import {
  createOrderSchema, quoteSchema, idParamSchema,
} from '../validators/order.validator.js'

const router = Router()
 
// Everything below needs a signed-in customer.
router.get('/', authenticate, controller.listMine)
router.get('/:id', authenticate, validate(idParamSchema, 'params'), controller.getOne)
router.get('/:id/payment-status', authenticate, validate(idParamSchema, 'params'), controller.paymentStatus)
router.post('/:id/pay', authenticate, validate(idParamSchema, 'params'), controller.pay)
router.post('/:id/cancel', authenticate, validate(idParamSchema, 'params'), controller.cancel)

export default router
