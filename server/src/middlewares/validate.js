import { ApiError } from '../utils/api-error.js';

/**
 * Validates part of the request against a zod schema.
 *
 *   validate(createProductSchema)            // req.body
 *   validate(productQuerySchema, 'query')    // req.query
 *   validate(idParamSchema, 'params')        // req.params
 *
 * On success the parsed value REPLACES the raw one, which means:
 *   - types are coerced ("12" -> 12)
 *   - unknown keys are stripped, so a client can't sneak `role: "admin"`
 *     into a profile update (mass-assignment protection)
 */
export const validate =
  (schema, source = 'body') =>
  (req, _res, next) => {
    const result = schema.safeParse(req[source] ?? {});

    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join('.') || source,
        message: issue.message,
      }));
      return next(ApiError.validation(details));
    }

    // req.query is a getter on newer Express; assign defensively.
    try {
      req[source] = result.data;
    } catch {
      Object.defineProperty(req, source, {
        value: result.data,
        writable: true,
      });
    }
    next();
  };
