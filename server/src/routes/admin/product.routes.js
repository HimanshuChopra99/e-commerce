import { Router } from 'express'
import * as controller from '../../controllers/admin/product.controller.js'
import { validate } from '../../middlewares/validate.js'
import { productImageUpload, upload } from '../../middlewares/upload.js'
import {
  adminProductQuerySchema, createProductSchema, updateProductSchema,
  updateVariantsSchema, bulkStatusSchema, bulkDeleteSchema,
} from '../../validators/product.validator.js'
import { idParamSchema } from '../../validators/order.validator.js'

const router = Router()

// authenticate + requireAdmin are already applied in routes/admin/index.js.

// Static paths first, so "stats" isn't matched as an :id.
router.get('/stats', controller.stats)
router.get('/low-stock', controller.lowStock)
router.get('/export', controller.exportCsv)

router.get('/', validate(adminProductQuerySchema, 'query'), controller.list)
router.post('/', validate(createProductSchema), controller.create)

router.post('/bulk-status', validate(bulkStatusSchema), controller.bulkStatus)
router.post('/bulk-delete', validate(bulkDeleteSchema), controller.bulkRemove)
router.post(
  '/image-uploads',
  productImageUpload.array('images', 48),
  controller.uploadImageAssets
)

router.get('/:id', validate(idParamSchema, 'params'), controller.getOne)
router.patch('/:id', validate(idParamSchema, 'params'), validate(updateProductSchema), controller.update)
router.delete('/:id', validate(idParamSchema, 'params'), controller.remove)

router.patch(
  '/:id/variants',
  validate(idParamSchema, 'params'),
  validate(updateVariantsSchema),
  controller.updateVariants
)

router.post('/:id/images', validate(idParamSchema, 'params'), upload.array('images', 8), controller.uploadImages)
router.delete('/:id/images', validate(idParamSchema, 'params'), controller.deleteImage)

export default router
