import { ApiError } from '../utils/api-error.js';
import { logger } from '../config/logger.js';
import { env } from '../config/env.js';

/** Unmatched route -> 404 in the standard envelope. */
export function notFound(req, _res, next) {
  next(
    ApiError.notFound(`Route ${req.method} ${req.originalUrl} does not exist.`)
  );
}

/**
 * Turns any thrown value into a consistent JSON error.
 *
 * MySQL and library errors are translated into something the client can act
 * on; anything unrecognised becomes a generic 500 with the real details
 * logged but never sent — that's what stops a SQL error leaking your schema.
 */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  let error = err;

  if (!(error instanceof ApiError)) {
    error = translate(err);
  }

  const status = error.statusCode ?? 500;

  const context = {
    requestId: req.id,
    method: req.method,
    url: req.originalUrl,
    userId: req.user?.publicId,
    ip: req.ip,
    code: error.code,
  };

  if (status >= 500) {
    logger.error({ ...context, err }, error.message);
  } else {
    logger.warn(context, error.message);
  }

  // Never echo an internal message to the client.
  const clientMessage =
    status >= 500 && !err.expected
      ? 'Something went wrong. Please try again.'
      : error.message;

  const body = {
    success: false,
    error: {
      code: error.code ?? 'INTERNAL_ERROR',
      message: clientMessage,
    },
  };
  if (error.details) body.error.details = error.details;
  if (!env.isProd && status >= 500) body.error.stack = err.stack;

  if (res.headersSent) return;
  res.status(status).json(body);
}

/** Maps known driver/library errors onto ApiError. */
function translate(err) {
  switch (err.code) {
    case 'ER_DUP_ENTRY': {
      const field = readDuplicateField(err.sqlMessage);
      return ApiError.conflict(
        field ? `That ${field} is already taken.` : 'That value already exists.'
      );
    }
    case 'ER_NO_REFERENCED_ROW':
    case 'ER_NO_REFERENCED_ROW_2':
      return ApiError.badRequest('A referenced record does not exist.');

    case 'ER_ROW_IS_REFERENCED':
    case 'ER_ROW_IS_REFERENCED_2':
      return ApiError.conflict('This record is still in use elsewhere.');

    case 'ER_DATA_TOO_LONG':
      return ApiError.badRequest('One of the values is too long.');

    case 'ER_CHECK_CONSTRAINT_VIOLATED':
    case 'ER_CONSTRAINT_FAILED':
      return ApiError.badRequest('That change would break a data rule.');

    case 'WARN_DATA_TRUNCATED':
      return ApiError.badRequest('One of the values is not an allowed option.');

    case 'ER_LOCK_DEADLOCK':
      return new ApiError(
        409,
        'CONFLICT',
        'The system was busy. Please try again.'
      );

    case 'ECONNREFUSED':
    case 'PROTOCOL_CONNECTION_LOST':
    case 'ER_CON_COUNT_ERROR':
      return ApiError.unavailable(
        'The database is unavailable. Please try again shortly.'
      );

    default:
      break;
  }

  // Body parser: malformed JSON
  if (err.type === 'entity.parse.failed') {
    return ApiError.badRequest('Request body is not valid JSON.');
  }
  if (err.type === 'entity.too.large') {
    return ApiError.badRequest('Request body is too large.');
  }
  // multer
  if (err.code === 'LIMIT_FILE_SIZE') {
    return ApiError.badRequest('That file is too large.');
  }
  if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') {
    return ApiError.badRequest('Too many files, or an unexpected field name.');
  }
  if (err.message === 'NOT_ALLOWED_BY_CORS') {
    return ApiError.forbidden('This origin is not allowed.');
  }

  return ApiError.internal();
}

/** Pulls a readable field name out of "Duplicate entry 'x' for key 'uq_users_email'". */
function readDuplicateField(sqlMessage = '') {
  const match = /for key '(?:\w+\.)?(\w+)'/.exec(sqlMessage);
  if (!match) return null;
  return match[1]
    .replace(/^uq_/, '')
    .replace(/^(users|products|categories|orders|variants|stripe)_/, '')
    .replace(/_/g, ' ');
}
