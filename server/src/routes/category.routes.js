import { Router } from 'express'
import * as controller from '../controllers/category.controller.js'
import { validate } from '../middlewares/validate.js'
import { productQuerySchema } from '../validators/product.validator.js'
import { slugParamSchema } from '../validators/order.validator.js'

const router = Router()

router.get('/', controller.list)
router.get('/:slug', validate(slugParamSchema, 'params'), controller.getBySlug)
router.get(
  '/:slug/products',
  validate(slugParamSchema, 'params'),
  validate(productQuerySchema, 'query'),
  controller.listProducts
)

export default router
