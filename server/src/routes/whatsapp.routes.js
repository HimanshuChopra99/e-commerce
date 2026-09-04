import { Router } from 'express';
import { validate } from '../middlewares/validate.js';
import * as controller from '../controllers/whatsapp.controller.js';
import { agentSearchSchema } from '../validators/whatsapp.validator.js';

const router = Router();

/**
 * WhatsApp / n8n Single Endpoint:
 *
 *   POST /api/whatsapp/search  → unified structured search / top 2-3 / 80-90% exact match
 *   POST /api/whatsapp         → alias for convenience
 *   GET  /api/whatsapp/search  → status / schema info
 */
router.post('/search', validate(agentSearchSchema, 'body'), controller.search);
router.get('/search', controller.info);

router.post('/', validate(agentSearchSchema, 'body'), controller.search);
router.get('/', controller.info);

export default router;
