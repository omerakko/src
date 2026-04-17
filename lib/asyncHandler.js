/**
 * Wraps an async route handler so any thrown error is forwarded to Express's
 * next(err) chain instead of becoming an unhandled promise rejection.
 *
 * Without this, every route needs its own try/catch. With it, a single
 * centralized error handler in app.js covers everything.
 *
 * Usage:
 *   router.get('/path', asyncHandler(async (req, res) => { ... }));
 */
const asyncHandler = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
