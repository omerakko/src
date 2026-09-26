const path = require('path');
const fs   = require('fs');
const fsp  = require('fs/promises');

/**
 * Resized WebP variants of the uploaded images, generated on demand.
 *
 * Originals in assets/images are whatever the artist uploaded — several are
 * 3–4 MB PNGs — and they stay untouched: they're the files Google Images
 * indexes and the artist's masters. Pages instead reference
 * /img/<width>/<folder>/<file>, which resolves here to a cached WebP at that
 * width (typically 30–150 KB). The first request for a size does the
 * conversion; every later one is a plain file read.
 *
 * The cache lives inside assets/images because on the server that is the
 * only assets folder the app user can write to. The dot prefix keeps
 * express.static from ever serving it as a static path.
 */
const ASSETS_DIR = path.join(__dirname, '..', 'assets');
const CACHE_DIR  = path.join(ASSETS_DIR, 'images', '.cache');

const FOLDERS = new Set(['images', 'banner']);
// Whitelisted so a crawler can't fill the disk by requesting arbitrary sizes.
const WIDTHS  = [480, 960, 1600];
const WEBP_QUALITY = 80;
// Basenames only. Older uploads have names like "WhatsApp Image 2025-….jpeg",
// so spaces and punctuation are fine; a leading dot ("..", ".cache") or any
// path separator is not.
const NAME_RE = /^(?!\.)[^/\\\0]+$/;

let sharp = null;
function getSharp() {
  if (sharp === null) {
    try {
      sharp = require('sharp');
    } catch (err) {
      sharp = false;
      console.warn('[images] sharp is not available — serving originals instead:', err.message);
    }
  }
  return sharp;
}

const originalPath = (folder, file)        => path.join(ASSETS_DIR, folder, file);
const variantPath  = (folder, file, width) => path.join(CACHE_DIR, folder, String(width), `${file}.webp`);

// One conversion per variant at a time, however many requests race for it.
const inFlight = new Map();

/**
 * Resolves to the file to serve: the cached WebP, or the original when the
 * conversion isn't possible. Resolves to null when the request is invalid or
 * the original doesn't exist.
 */
async function getVariant(folder, file, width) {
  if (!FOLDERS.has(folder) || !NAME_RE.test(file) || !WIDTHS.includes(width)) return null;

  const original = originalPath(folder, file);
  const out      = variantPath(folder, file, width);

  if (fs.existsSync(out)) return out;
  if (!fs.existsSync(original)) return null;

  const s = getSharp();
  if (!s) return original;

  if (!inFlight.has(out)) {
    inFlight.set(out, convert(s, original, out, width).finally(() => inFlight.delete(out)));
  }
  return inFlight.get(out);
}

async function convert(s, original, out, width) {
  await fsp.mkdir(path.dirname(out), { recursive: true });
  // Write to a temp name and rename so a concurrent reader never sees a
  // half-written file.
  const tmp = `${out}.${process.pid}.${Date.now()}.tmp`;
  try {
    await s(original, { failOn: 'none' })
      .rotate()                                   // apply EXIF orientation from phone photos
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY })
      .toFile(tmp);
    await fsp.rename(tmp, out);
    return out;
  } catch (err) {
    await fsp.unlink(tmp).catch(() => {});
    console.warn(`[images] could not convert ${path.basename(original)} @${width}:`, err.message);
    return original;
  }
}

/** Generates every width for one file. Used right after uploads and by scripts/warm-image-cache.js. */
async function warm(folder, file) {
  for (const width of WIDTHS) await getVariant(folder, file, width);
}

/** Removes the cached variants of a deleted original. */
async function evict(folder, file) {
  await Promise.all(WIDTHS.map(w => fsp.unlink(variantPath(folder, file, w)).catch(() => {})));
}

/**
 * Express middleware for the admin upload routes: kicks off variant generation
 * for whatever multer just stored, without holding up the response.
 */
function warmUploads(req, _res, next) {
  const files = req.files || (req.file ? [req.file] : []);
  for (const f of files) warm('images', f.filename).catch(() => {});
  next();
}

module.exports = { getVariant, warm, evict, warmUploads, WIDTHS, FOLDERS, CACHE_DIR, ASSETS_DIR };
