import { Router } from 'express';
import * as controller from '../../controllers/admin/order.controller.js';
import { validate } from '../../middlewares/validate.js';
import {
  orderQuerySchema,
  updateOrderStatusSchema,
  updateTrackingSchema,
  updateNoteSchema,
  refundSchema,
  idParamSchema,
} from '../../validators/order.validator.js';

const router = Router();

router.get('/export', controller.exportCsv);

router.get('/', validate(orderQuerySchema, 'query'), controller.list);
router.get('/:id', validate(idParamSchema, 'params'), controller.getOne);

router.patch(
  '/:id/status',
  validate(idParamSchema, 'params'),
  validate(updateOrderStatusSchema),
  controller.updateStatus
);
router.patch(
  '/:id/tracking',
  validate(idParamSchema, 'params'),
  validate(updateTrackingSchema),
  controller.updateTracking
);
router.patch(
  '/:id/note',
  validate(idParamSchema, 'params'),
  validate(updateNoteSchema),
  controller.updateNote
);
router.post(
  '/:id/refund',
  validate(idParamSchema, 'params'),
  validate(refundSchema),
  controller.refund
);

export default router;
