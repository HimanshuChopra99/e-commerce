import { Router } from 'express';
import * as controller from '../controllers/product.controller.js';
import { validate } from '../middlewares/validate.js';
import { searchLimiter } from '../middlewares/rate-limit.js';
import { productQuerySchema } from '../validators/product.validator.js';
import { slugParamSchema } from '../validators/order.validator.js';

const router = Router();

// Static paths must come BEFORE /:slug, or "featured" would be read as a slug.
router.get('/featured', controller.featured);
router.get('/filters', controller.filters);

router.get(
  '/',
  searchLimiter,
  validate(productQuerySchema, 'query'),
  controller.list
);
router.get('/:slug', validate(slugParamSchema, 'params'), controller.getBySlug);
router.get(
  '/:slug/related',
  validate(slugParamSchema, 'params'),
  controller.related
);

export default router;
