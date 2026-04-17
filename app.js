/**
 * app.js — Express application setup.
 *
 * Deliberately separated from server.js so the app can be imported in tests
 * without binding a port. This is the standard Express pattern for testability.
 */
const express = require('express');
const path    = require('path');

const { verifyToken, requireAdmin } = require('./middleware/auth');

const app = express();

// ---------------------------------------------------------------------------
// Body parsing
// 1 MB is more than enough for JSON payloads. The old 50 MB limit made the
// server a target for memory-exhaustion attacks via large JSON bodies.
// File uploads go through multer (multipart/form-data) and bypass this limit.
// ---------------------------------------------------------------------------
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ---------------------------------------------------------------------------
// Static files — scoped to /assets only.
// The old code served the entire project root (__dirname), which exposed
// source files, .env, node_modules, etc. to anyone who guessed the path.
// ---------------------------------------------------------------------------
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// ---------------------------------------------------------------------------
// Route mounting
// ---------------------------------------------------------------------------
app.use('/api/auth',        require('./routes/auth'));
app.use('/api/paintings',   require('./routes/paintings'));
app.use('/api/exhibitions', require('./routes/exhibitions'));

// Admin routes are protected at the mount point so every sub-route inside
// those routers is automatically guarded — no risk of forgetting a middleware.
app.use('/api/admin/paintings',   verifyToken, requireAdmin, require('./routes/admin/paintings'));
app.use('/api/admin/exhibitions', verifyToken, requireAdmin, require('./routes/admin/exhibitions'));

// ---------------------------------------------------------------------------
// Centralized error handler
// Any route that calls next(err) — or any asyncHandler that catches a throw —
// ends up here. One place to decide status code, log level, and response shape.
// ---------------------------------------------------------------------------
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  const status = err.status || 500;

  // Log 5xx errors (our fault); skip 4xx (client's fault, not actionable).
  if (status >= 500) {
    console.error(`[${req.method} ${req.path}]`, err);
  }

  res.status(status).json({
    error: err.message || 'Internal server error',
    // Only expose stack traces to developers.
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

module.exports = app;
