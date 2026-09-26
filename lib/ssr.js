/**
 * lib/ssr.js — renders Angular pages inside this process.
 *
 * The frontend build emits dist/.../server/server.mjs, which exports a
 * render(url, apiBase) function (see frontend/src/server.ts). We load it
 * lazily on the first page request so the API keeps working even if the
 * bundle is missing or broken — in that case the plain client-side shell is
 * served instead, exactly as before SSR existed.
 *
 * Rendered HTML is cached in memory for a few minutes. Pages only change when
 * the artist edits something in the admin panel, and app.js clears the cache
 * after every admin write, so the TTL is just a safety net.
 */
const path = require('path');
const fs   = require('fs');
const { pathToFileURL } = require('url');

const DIST         = path.join(__dirname, '..', 'frontend', 'dist', 'nilufer-orel-portfolio');
const BROWSER_DIR  = path.join(DIST, 'browser');
const SERVER_ENTRY = path.join(DIST, 'server', 'server.mjs');

// With SSR enabled the CLI names the browser shell index.csr.html; older
// builds only have index.html.
const CSR_SHELL = ['index.csr.html', 'index.html']
  .map(f => path.join(BROWSER_DIR, f))
  .find(fs.existsSync) || path.join(BROWSER_DIR, 'index.html');

const CACHE_TTL_MS      = 10 * 60 * 1000;
const CACHE_MAX_ENTRIES = 200;
const RENDER_TIMEOUT_MS = 8000;

const cache = new Map(); // path -> { html, expires }
let modulePromise = null;

function ssrAvailable() {
  return fs.existsSync(SERVER_ENTRY);
}

function loadModule() {
  if (!modulePromise) {
    modulePromise = import(pathToFileURL(SERVER_ENTRY).href).catch(err => {
      modulePromise = null; // allow a retry on the next request
      throw err;
    });
  }
  return modulePromise;
}

function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`SSR render exceeded ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/**
 * @param {string} pagePath  Path without query string, e.g. '/exhibitions/49'
 * @param {string} origin    Origin the page is rendered under. Angular resolves
 *                           the app's relative '/api/...' calls against it, so
 *                           this must be this server's own local address —
 *                           not the public domain, which would send every
 *                           render out through nginx and back.
 */
async function renderPage(pagePath, origin) {
  const hit = cache.get(pagePath);
  if (hit && hit.expires > Date.now()) return hit.html;

  const mod  = await loadModule();
  const html = await withTimeout(mod.render(origin + pagePath), RENDER_TIMEOUT_MS);

  if (cache.size >= CACHE_MAX_ENTRIES) cache.delete(cache.keys().next().value);
  cache.set(pagePath, { html, expires: Date.now() + CACHE_TTL_MS });
  return html;
}

function clearCache() {
  cache.clear();
}

module.exports = { renderPage, clearCache, ssrAvailable, CSR_SHELL, BROWSER_DIR };
