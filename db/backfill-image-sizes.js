/**
 * Migration + repair for painting image data.
 *
 *   node db/backfill-image-sizes.js
 *
 * Three steps, in order:
 *   1. Add the imagewidth/imageheight columns if they're missing.
 *   2. Normalise any imageurl stored as a relative path.
 *   3. Fill in dimensions by reading each image file's header off disk.
 *
 * Step 2 comes before step 3 deliberately — a relative imageurl is exactly
 * what stops step 3 finding the file.
 *
 * Why a script rather than sequelize.sync({ alter: true })? server.js only
 * syncs when NODE_ENV === 'development', and alter:true is explicitly called
 * out there as unsafe for production. This does the narrow changes needed,
 * and is safe to re-run: the DDL is IF NOT EXISTS, the normalisation only
 * matches malformed values, and the backfill only touches rows still
 * missing dimensions.
 */
require('dotenv').config();

const path      = require('path');
const sequelize = require('./index');
const { Painting } = require('../models');
const { readImageSize } = require('../lib/imageSize');

/**
 * Rewrites any imageurl held as a relative path into the site-absolute form
 * the upload route produces, e.g.
 *   "../assets/images/foo.jpeg"  ->  "/assets/images/foo.jpeg"
 *
 * Express normalises the relative form when serving, and the browser
 * resolves it to the same URL from /paintings, so these rows rendered fine
 * and the inconsistency went unnoticed. Server-side is where it bites:
 * path.join() against a relative value walks out of the project directory,
 * which is what made these rows unreadable during the first backfill.
 *
 * Only touches values that don't already start with /assets/images/, so
 * re-running is a no-op.
 */
async function normaliseImageUrls(paintings) {
  const prefix = '/assets/images/';
  let fixed = 0;

  for (const painting of paintings) {
    const url = painting.imageurl;
    if (!url || url.startsWith(prefix)) continue;

    const marker = 'assets/images/';
    const at = url.replace(/\\/g, '/').lastIndexOf(marker);
    if (at === -1) {
      console.warn(`[backfill]  #${painting.id} "${painting.title}" — imageurl not under assets/images, left alone: ${url}`);
      continue;
    }

    const normalised = prefix + url.replace(/\\/g, '/').slice(at + marker.length);
    await painting.update({ imageurl: normalised });
    console.log(`[backfill]  #${painting.id} "${painting.title}" — url ${url} -> ${normalised}`);
    fixed++;
  }

  console.log(`[backfill] Image URLs normalised: ${fixed}`);
}

/**
 * Maps a stored imageurl onto a path on disk.
 *
 * Most rows hold "/assets/images/foo.png", but some older ones hold
 * "../assets/images/foo.png". The browser resolves both to the same URL from
 * /paintings, so the difference went unnoticed — but joining the relative
 * form against a directory walks out of the project entirely. Anchor on the
 * "assets/images/" segment instead of trusting the prefix.
 */
function resolveImagePath(imageUrl) {
  const marker = 'assets/images/';
  const at = imageUrl.replace(/\\/g, '/').lastIndexOf(marker);
  if (at === -1) return null;

  const filename = imageUrl.replace(/\\/g, '/').slice(at + marker.length);
  if (!filename) return null;

  return path.join(__dirname, '..', 'assets', 'images', filename);
}

async function run() {
  await sequelize.authenticate();
  console.log('[backfill] Connected to PostgreSQL');

  await sequelize.query(`
    ALTER TABLE paintings
      ADD COLUMN IF NOT EXISTS imagewidth  INTEGER,
      ADD COLUMN IF NOT EXISTS imageheight INTEGER
  `);
  console.log('[backfill] Columns present');

  const paintings = await Painting.findAll();

  await normaliseImageUrls(paintings);

  let filled = 0, skipped = 0, missing = 0;

  for (const painting of paintings) {
    if (painting.imagewidth && painting.imageheight) { skipped++; continue; }

    if (!painting.imageurl) {
      console.warn(`[backfill]  #${painting.id} "${painting.title}" — no imageurl`);
      missing++;
      continue;
    }

    const filePath = resolveImagePath(painting.imageurl);
    const size = filePath ? await readImageSize(filePath) : null;

    if (!size) {
      console.warn(`[backfill]  #${painting.id} "${painting.title}" — unreadable: ${painting.imageurl}`);
      missing++;
      continue;
    }

    await painting.update({ imagewidth: size.width, imageheight: size.height });
    console.log(`[backfill]  #${painting.id} "${painting.title}" — ${size.width}x${size.height}`);
    filled++;
  }

  console.log(`\n[backfill] Done. filled=${filled} already-set=${skipped} unreadable=${missing}`);
  await sequelize.close();
}

run().catch(async err => {
  console.error('[backfill] Failed:', err);
  await sequelize.close().catch(() => {});
  process.exit(1);
});
