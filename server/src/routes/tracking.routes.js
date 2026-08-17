import { Router } from 'express'
import * as controller from '../controllers/tracking.controller.js'
import { authenticate, requireAdmin } from '../middlewares/authenticate.js'
import { validate } from '../middlewares/validate.js'
import { trackingParamSchema, pingSchema } from '../validators/tracking.validator.js'

const router = Router()

/**
 * Public read — the tracking number is the secret, so it is validated as a
 * strict [A-Za-z0-9_-] token before it ever reaches a Redis key.
 */
router.get(
    '/:trackingNumber',
    validate(trackingParamSchema, 'params'),
    controller.getSession
)

/**
 * Courier writes. These are guarded per-route rather than with a router-level
 * `use`, because the GET above must stay public — a blanket guard here would
 * silently lock customers out of their own tracking page.
 */
router.post(
    '/:trackingNumber/ping',
    authenticate,
    requireAdmin,
    validate(trackingParamSchema, 'params'),
    validate(pingSchema),
    controller.savePing
)

router.post(
    '/:trackingNumber/complete',
    authenticate,
    requireAdmin,
    validate(trackingParamSchema, 'params'),
    controller.completeSession
)

export default router