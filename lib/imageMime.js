const fs = require('fs');

/**
 * Detects an image's MIME type from its first bytes.
 *
 * Why: most files in assets/images were uploaded before the filename
 * generator added extensions, so express.static has nothing to derive a
 * Content-Type from and sends them as application/octet-stream. Browsers
 * still display those, but Google Images refuses to index a file it isn't
 * told is an image. Reading 16 bytes of the header fixes that for every
 * request without renaming files or touching database rows.
 *
 * Results are memoised per path: upload names are unique and never reused.
 */
const cache = new Map();

function sniffImageMime(filePath) {
  if (cache.has(filePath)) return cache.get(filePath);

  let mime = null;
  try {
    const fd = fs.openSync(filePath, 'r');
    try {
      const buf = Buffer.alloc(16);
      const n = fs.readSync(fd, buf, 0, 16, 0);
      mime = detect(buf.subarray(0, n));
    } finally {
      fs.closeSync(fd);
    }
  } catch {
    mime = null;
  }

  cache.set(filePath, mime);
  return mime;
}

function detect(b) {
  if (b.length >= 4 && b.readUInt32BE(0) === 0x89504e47) return 'image/png';
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b.length >= 4 && b.toString('ascii', 0, 4) === 'GIF8') return 'image/gif';
  if (b.length >= 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  return null;
}

module.exports = { sniffImageMime };
