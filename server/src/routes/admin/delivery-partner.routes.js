import { Router } from 'express'
import * as controller from '../../controllers/admin/delivery-partner.controller.js'
import { validate } from '../../middlewares/validate.js'
import {
  deliveryPartnerQuerySchema,
  createDeliveryPartnerSchema,
  updateDeliveryPartnerSchema,
  updateDeliveryPartnerStatusSchema,
  idParamSchema,
} from '../../validators/order.validator.js'

const router = Router()

router.get('/export', controller.exportCsv)

router.get('/', validate(deliveryPartnerQuerySchema, 'query'), controller.list)
router.get('/:id', validate(idParamSchema, 'params'), controller.getOne)
router.get('/:id/orders', validate(idParamSchema, 'params'), controller.listOrders)

router.post('/', validate(createDeliveryPartnerSchema), controller.create)
router.patch('/:id', validate(idParamSchema, 'params'), validate(updateDeliveryPartnerSchema), controller.update)
router.patch('/:id/status', validate(idParamSchema, 'params'), validate(updateDeliveryPartnerStatusSchema), controller.updateStatus)
router.delete('/:id', validate(idParamSchema, 'params'), controller.remove)

export default router
