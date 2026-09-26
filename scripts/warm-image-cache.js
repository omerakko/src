/**
 * Pre-generates the resized WebP variants for every image already on disk,
 * so no visitor ever waits for a first-time conversion.
 *
 *   node scripts/warm-image-cache.js
 *
 * Safe to run repeatedly: variants that already exist are skipped, so after
 * the first pass it finishes in seconds. deploy.sh runs it in the background
 * on the server after every restart.
 */
const path = require('path');
const fsp  = require('fs/promises');
const { warm, FOLDERS, WIDTHS, ASSETS_DIR } = require('../lib/imageVariants');

async function main() {
  const started = Date.now();
  let count = 0;

  for (const folder of FOLDERS) {
    const dir = path.join(ASSETS_DIR, folder);
    const entries = await fsp.readdir(dir, { withFileTypes: true }).catch(() => []);
    const files = entries.filter(e => e.isFile() && !e.name.startsWith('.')).map(e => e.name);

    for (const file of files) {
      await warm(folder, file);
      count++;
      if (count % 25 === 0) console.log(`[warm] ${count} files done…`);
    }
  }

  console.log(`[warm] ${count} files × ${WIDTHS.length} widths in ${((Date.now() - started) / 1000).toFixed(1)}s`);
}

main().catch(err => {
  console.error('[warm] failed:', err);
  process.exit(1);
});
