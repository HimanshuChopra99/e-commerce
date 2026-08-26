import { Router } from 'express';
import * as controller from '../controllers/customer-state.controller.js';
import { authenticate, requireAuth } from '../middlewares/authenticate.js';
import { validate } from '../middlewares/validate.js';
import {
  cartItemSchema,
  cartSyncSchema,
  favouriteSyncSchema,
  productParamSchema,
  variantParamSchema,
} from '../validators/customer-state.validator.js';

const router = Router();
router.use(['/cart', '/favourites'], authenticate, requireAuth);

router.get('/cart', controller.getCart);
router.post('/cart/sync', validate(cartSyncSchema), controller.syncCart);
router.post('/cart/items', validate(cartItemSchema), controller.addCartItem);
router.patch(
  '/cart/items/:variantId',
  validate(variantParamSchema, 'params'),
  validate(cartItemSchema.omit({ variantId: true })),
  (req, _res, next) => {
    req.body.variantId = req.params.variantId;
    next();
  },
  controller.setCartItem
);
router.delete(
  '/cart/items/:variantId',
  validate(variantParamSchema, 'params'),
  controller.removeCartItem
);
router.delete('/cart', controller.clearCart);

router.get('/favourites', controller.getFavourites);
router.post(
  '/favourites/sync',
  validate(favouriteSyncSchema),
  controller.syncFavourites
);
router.post(
  '/favourites/:productId',
  validate(productParamSchema, 'params'),
  controller.addFavourite
);
router.delete(
  '/favourites/:productId',
  validate(productParamSchema, 'params'),
  controller.removeFavourite
);

export default router;
