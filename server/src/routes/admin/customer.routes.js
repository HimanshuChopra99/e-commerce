import { Router } from 'express';
import * as controller from '../../controllers/admin/customer.controller.js';
import { validate } from '../../middlewares/validate.js';
import {
  customerQuerySchema,
  updateCustomerSchema,
  updateCustomerStatusSchema,
  idParamSchema,
} from '../../validators/order.validator.js';

const router = Router();

router.get('/export', controller.exportCsv);

router.get('/', validate(customerQuerySchema, 'query'), controller.list);
router.get('/:id', validate(idParamSchema, 'params'), controller.getOne);
router.get(
  '/:id/orders',
  validate(idParamSchema, 'params'),
  controller.listOrders
);

router.patch(
  '/:id',
  validate(idParamSchema, 'params'),
  validate(updateCustomerSchema),
  controller.update
);
router.patch(
  '/:id/status',
  validate(idParamSchema, 'params'),
  validate(updateCustomerStatusSchema),
  controller.updateStatus
);

export default router;
