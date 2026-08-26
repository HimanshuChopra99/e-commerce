import { Router } from 'express';
import * as controller from '../controllers/delivery-partner.controller.js';
import {
  authenticateDeliveryPartner,
  requireDeliveryPartner,
} from '../middlewares/delivery-partner-auth.js';

const router = Router();

// Public
router.post('/register', controller.register);
router.post('/login', controller.login);

// Protected
router.get(
  '/me',
  authenticateDeliveryPartner,
  requireDeliveryPartner,
  controller.me
);
router.patch(
  '/me/online',
  authenticateDeliveryPartner,
  requireDeliveryPartner,
  controller.setOnline
);
router.get(
  '/orders/available',
  authenticateDeliveryPartner,
  requireDeliveryPartner,
  controller.getAvailableOrders
);
router.post(
  '/orders/:orderId/accept',
  authenticateDeliveryPartner,
  requireDeliveryPartner,
  controller.acceptOrder
);
router.post(
  '/orders/:orderId/pickup',
  authenticateDeliveryPartner,
  requireDeliveryPartner,
  controller.markPickedUp
);
router.post(
  '/orders/:orderId/deliver',
  authenticateDeliveryPartner,
  requireDeliveryPartner,
  controller.markDelivered
);

export default router;
