/**
 * server.ts — SSR entry. The Angular CLI bundles this into
 * dist/nilufer-orel-portfolio/server/server.mjs.
 *
 * It deliberately does NOT start an HTTP server. The Express backend
 * (../app.js) imports this module and calls render() from its catch-all
 * route, so there is a single process, a single port, and a single place
 * that knows where the API lives.
 */
import { CommonEngine } from '@angular/ssr';
import { APP_BASE_HREF } from '@angular/common';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import bootstrap from './main.server';

const serverDist  = dirname(fileURLToPath(import.meta.url));
const browserDist = resolve(serverDist, '..', 'browser');

// The CLI writes the SSR document next to the server bundle. Fall back to the
// browser shell so a build without it still renders instead of throwing.
const documentFilePath = [
  join(serverDist, 'index.server.html'),
  join(browserDist, 'index.csr.html'),
  join(browserDist, 'index.html'),
].find(existsSync)!;

const engine = new CommonEngine({ bootstrap });

/**
 * @param url Absolute URL of the page to render. Its origin matters: Angular's
 *            server platform resolves the services' relative '/api/...' calls
 *            against it, so the backend passes its own local address
 *            (http://127.0.0.1:3000/paintings) rather than the public domain.
 *            Canonical links and Open Graph URLs are set explicitly by
 *            SeoService and never derive from this value.
 */
export function render(url: string): Promise<string> {
  return engine.render({
    bootstrap,
    documentFilePath,
    url,
    publicPath: browserDist,
    providers: [{ provide: APP_BASE_HREF, useValue: '/' }],
  });
}
