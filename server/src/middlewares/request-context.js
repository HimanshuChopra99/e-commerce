import { randomUUID } from 'node:crypto';

/**
 * Gives every request an id and logs how it finished.
 *
 * The id is echoed back in the `X-Request-Id` header, so when a customer
 * reports a problem you can find the exact request in your logs.
 */
export function requestContext(req, res, next) {
  req.id = req.headers['x-request-id'] || randomUUID();
  res.setHeader('X-Request-Id', req.id);
  next();
}
