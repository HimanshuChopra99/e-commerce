/**
 * An error you intend the client to see.
 *
 * Anything thrown that is NOT an ApiError becomes a generic 500 with the
 * details logged but hidden — so an accidental SQL error can never leak your
 * schema to the internet.
 */
export class ApiError extends Error {
  constructor(statusCode, code, message, details = null) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.expected = true;
    Error.captureStackTrace?.(this, ApiError);
  }

  static badRequest(message = 'Bad request.', details = null) {
    return new ApiError(400, 'BAD_REQUEST', message, details);
  }

  static unauthorized(message = 'Sign in to continue.') {
    return new ApiError(401, 'UNAUTHENTICATED', message);
  }

  static forbidden(message = 'You do not have access to this.') {
    return new ApiError(403, 'FORBIDDEN', message);
  }

  static notFound(message = 'Not found.') {
    return new ApiError(404, 'NOT_FOUND', message);
  }

  static conflict(message = 'That already exists.', details = null) {
    return new ApiError(409, 'CONFLICT', message, details);
  }

  static insufficientStock(message, details = null) {
    return new ApiError(409, 'INSUFFICIENT_STOCK', message, details);
  }

  static validation(details) {
    return new ApiError(
      422,
      'VALIDATION_ERROR',
      'Please check the highlighted fields.',
      details
    );
  }

  static tooMany(message = 'Too many requests. Please slow down.') {
    return new ApiError(429, 'RATE_LIMITED', message);
  }

  static internal(message = 'Something went wrong. Please try again.') {
    return new ApiError(500, 'INTERNAL_ERROR', message);
  }

  static unavailable(message = 'This service is temporarily unavailable.') {
    return new ApiError(503, 'SERVICE_UNAVAILABLE', message);
  }
}
