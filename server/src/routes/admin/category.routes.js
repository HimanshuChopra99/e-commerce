import { Router } from 'express'
import * as controller from '../../controllers/admin/category.controller.js'
import { validate } from '../../middlewares/validate.js'
import {
  createCategorySchema, updateCategorySchema, assignProductsSchema,
} from '../../validators/product.validator.js'
import { idParamSchema } from '../../validators/order.validator.js'

const router = Router()

router.get('/', controller.list)
router.post('/', validate(createCategorySchema), controller.create)

router.get('/:id', validate(idParamSchema, 'params'), controller.getOne)
router.patch('/:id', validate(idParamSchema, 'params'), validate(updateCategorySchema), controller.update)
router.delete('/:id', validate(idParamSchema, 'params'), controller.remove)

router.get('/:id/products', validate(idParamSchema, 'params'), controller.listProducts)
router.post('/:id/products', validate(idParamSchema, 'params'), validate(assignProductsSchema), controller.assignProducts)
router.delete('/:id/products/:productId', validate(idParamSchema, 'params'), controller.removeProduct)

export default router
