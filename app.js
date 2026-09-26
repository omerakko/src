/**
 * app.js — Express application setup.
 *
 * Deliberately separated from server.js so the app can be imported in tests
 * without binding a port. This is the standard Express pattern for testability.
 */
const express     = require('express');
const path        = require('path');
const compression = require('compression');

const { verifyToken, requireAdmin } = require('./middleware/auth');
const { sniffImageMime } = require('./lib/imageMime');
const ssr = require('./lib/ssr');
const { Exhibition } = require('./models');

const app = express();

// Gzip/Brotli compress all text responses (JS, CSS, HTML, JSON).
app.use(compression());

// ---------------------------------------------------------------------------
// Body parsing
// 1 MB is more than enough for JSON payloads. The old 50 MB limit made the
// server a target for memory-exhaustion attacks via large JSON bodies.
// File uploads go through multer (multipart/form-data) and bypass this limit.
// ---------------------------------------------------------------------------
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ---------------------------------------------------------------------------
// Static files
// /assets  — painting images and other uploaded media.
// /        — Angular production build. The SPA's own assets (JS, CSS) live here.
// ---------------------------------------------------------------------------
// One URL per page: /paintings/ → /paintings. Search engines otherwise index
// both spellings and split their signals between them.
app.use((req, res, next) => {
  if (req.method === 'GET' && req.path.length > 1 && req.path.endsWith('/') && !req.path.startsWith('/api/')) {
    const clean = req.path.replace(/\/+$/, '') || '/';
    return res.redirect(301, clean + req.url.slice(req.path.length));
  }
  next();
});

// Legacy URL redirects — 301 so Google transfers link equity to the new URLs.
// These are old static-site paths that Google still has indexed. Registered
// before express.static: /index.html exists in the build and would otherwise
// be served as an empty shell instead of redirecting.
const LEGACY_REDIRECTS = {
  '/index.html':            '/',
  '/pages/biography.html':  '/about',
  '/pages/gallery.html':    '/paintings',
  '/pages/paintings.htm':   '/paintings',
  '/pages/paintings.html':  '/paintings',
};
app.get(Object.keys(LEGACY_REDIRECTS), (req, res) => {
  res.redirect(301, LEGACY_REDIRECTS[req.path]);
});

// robots.txt and sitemaps are generated from the database — mounted before
// express.static so they take priority over any file in the build.
app.use('/', require('./routes/sitemap'));

// Resized WebP variants: /img/<width>/images/<file> (see lib/imageVariants.js).
app.use('/', require('./routes/images'));

// Images: 30-day cache (filenames don't change between uploads).
// Files uploaded before extensions were added get their Content-Type from the
// file header; without it Google Images won't index them.
app.use('/assets', express.static(path.join(__dirname, 'assets'), {
  maxAge: '30d',
  immutable: false,
  setHeaders(res, filePath) {
    if (path.extname(filePath)) return;
    const mime = sniffImageMime(filePath);
    if (mime) res.setHeader('Content-Type', mime);
  }
}));

// Angular JS/CSS bundles have content hashes in filenames → safe to cache 1 year.
// index: false — pages are rendered by the SSR catch-all below, never served
// as a static file.
app.use(express.static(ssr.BROWSER_DIR, {
  maxAge: '1y',
  immutable: true,
  index: false,
  setHeaders(res, filePath) {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  }
}));

// ---------------------------------------------------------------------------
// Route mounting
// ---------------------------------------------------------------------------
app.use('/api/auth',        require('./routes/auth'));
app.use('/api/paintings',   require('./routes/paintings'));
app.use('/api/exhibitions', require('./routes/exhibitions'));

// Any successful admin write changes what the public pages show, so drop the
// rendered-HTML cache once the response has gone out.
app.use('/api/admin', (req, res, next) => {
  if (req.method !== 'GET') {
    res.on('finish', () => { if (res.statusCode < 400) ssr.clearCache(); });
  }
  next();
});

// Admin routes are protected at the mount point so every sub-route inside
// those routers is automatically guarded — no risk of forgetting a middleware.
app.use('/api/admin/paintings',   verifyToken, requireAdmin, require('./routes/admin/paintings'));
app.use('/api/admin/exhibitions', verifyToken, requireAdmin, require('./routes/admin/exhibitions'));

// ---------------------------------------------------------------------------
// Angular catch-all — must come AFTER all /api routes.
//
// Public pages are rendered on the server (lib/ssr.js) so crawlers receive
// finished HTML: painting images, exhibition titles, canonical URLs and
// structured data — not an empty shell that only fills in once JS runs.
// Admin and login are browser-only and get the plain shell. If rendering ever
// fails the shell is served too, so the site degrades to how it worked before.
// ---------------------------------------------------------------------------
const CSR_ONLY = /^\/(admin|login)(\/|$)/;
const NO_CACHE = { headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' } };

app.get(/.*/, async (req, res) => {
  if (CSR_ONLY.test(req.path) || !ssr.ssrAvailable()) {
    return res.sendFile(ssr.CSR_SHELL, NO_CACHE);
  }
  try {
    const [status, page] = await Promise.all([
      pageStatus(req.path),
      ssr.renderPage(req.path, `http://127.0.0.1:${process.env.PORT || 3000}`)
    ]);
    if (page.failed) {
      // Data was missing while rendering: tell crawlers to come back rather
      // than index a page with no works on it. Visitors still get the page,
      // and the browser refetches the data on its own.
      console.warn('[ssr] rendered without data (API error), answering 503 for', req.path);
      return res.status(503).set({ 'Cache-Control': 'no-store', 'Retry-After': '30' }).type('html').send(page.html);
    }
    res.status(status).set('Cache-Control', 'no-cache').type('html').send(page.html);
  } catch (err) {
    console.error('[ssr] falling back to client rendering for', req.path, err);
    res.sendFile(ssr.CSR_SHELL, NO_CACHE);
  }
});

// The Angular router silently redirects unknown paths to the home page. Serve
// those with a 404 so search engines drop them instead of indexing the home
// page under a second URL.
const STATIC_PAGES = new Set(['/', '/paintings', '/exhibitions', '/about']);
async function pageStatus(pagePath) {
  if (STATIC_PAGES.has(pagePath)) return 200;
  const m = pagePath.match(/^\/exhibitions\/(\d+)$/);
  if (m) return (await Exhibition.count({ where: { id: m[1] } })) ? 200 : 404;
  return 404;
}

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
