import { Router } from 'express';
import { stripeWebhook } from '../controllers/webhook.controller.js';

const router = Router();

// The raw-body parser is applied where this router is mounted in app.js,
// because Stripe signature verification needs the exact bytes it sent.
router.post('/stripe', stripeWebhook);

export default router;
