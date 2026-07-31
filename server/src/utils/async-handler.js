/**
 * Express 4 does not catch rejected promises from async handlers — an
 * unhandled rejection would hang the request and eventually crash the process.
 *
 * Wrapping every controller means one forgotten try/catch can't take the
 * server down; the error reaches the central error handler instead.
 */
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next)
