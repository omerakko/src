const fs = require('fs').promises;

/**
 * Reads pixel dimensions straight out of an image file's header.
 *
 * Why not use `image-size` or `sharp`? Same reasoning as the filename
 * generator in fileStorage.js — this is a handful of byte offsets for the
 * four formats the upload filter actually accepts, and `sharp` in particular
 * drags in a native binary that has to be rebuilt per platform.
 *
 * Only the first 64 KB is read: every format below stores its dimensions in
 * the header, so there's no reason to pull a 5 MB file into memory.
 *
 * Returns { width, height } or null if the format isn't recognised or the
 * header is truncated. Callers must treat null as "unknown", never as an
 * error — a painting without dimensions still has to save.
 */
async function readImageSize(filePath) {
  let buf;
  try {
    const handle = await fs.open(filePath, 'r');
    try {
      const { buffer, bytesRead } = await handle.read(Buffer.alloc(65536), 0, 65536, 0);
      buf = buffer.subarray(0, bytesRead);
    } finally {
      await handle.close();
    }
  } catch {
    return null;
  }

  if (buf.length < 16) return null;

  return readPng(buf) ?? readGif(buf) ?? readWebp(buf) ?? readJpeg(buf) ?? null;
}

/** PNG: 8-byte signature, then an IHDR chunk with width/height at fixed offsets. */
function readPng(buf) {
  if (buf.length < 24) return null;
  if (buf.readUInt32BE(0) !== 0x89504e47 || buf.readUInt32BE(4) !== 0x0d0a1a0a) return null;
  if (buf.toString('ascii', 12, 16) !== 'IHDR') return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

/** GIF: "GIF87a"/"GIF89a" then little-endian width/height. */
function readGif(buf) {
  if (buf.length < 10) return null;
  const sig = buf.toString('ascii', 0, 6);
  if (sig !== 'GIF87a' && sig !== 'GIF89a') return null;
  return { width: buf.readUInt16LE(6), height: buf.readUInt16LE(8) };
}

/**
 * WebP: RIFF container. Three sub-formats store dimensions differently —
 * VP8 (lossy), VP8L (lossless) and VP8X (extended).
 */
function readWebp(buf) {
  if (buf.length < 30) return null;
  if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WEBP') return null;

  const kind = buf.toString('ascii', 12, 16);

  if (kind === 'VP8X') {
    // 24-bit little-endian, stored as (dimension - 1)
    const width  = 1 + (buf[24] | (buf[25] << 8) | (buf[26] << 16));
    const height = 1 + (buf[27] | (buf[28] << 8) | (buf[29] << 16));
    return { width, height };
  }

  if (kind === 'VP8L') {
    // 14 bits each, packed across four bytes after the 1-byte signature
    const bits = buf.readUInt32LE(21);
    return { width: 1 + (bits & 0x3fff), height: 1 + ((bits >> 14) & 0x3fff) };
  }

  if (kind === 'VP8 ') {
    // Dimensions follow the 3-byte start code at offset 23
    return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
  }

  return null;
}

/**
 * JPEG: a marker chain. Walk it until a Start-Of-Frame marker, which carries
 * the real dimensions. Unlike the other formats these aren't at a fixed
 * offset, because any number of metadata segments (EXIF, ICC, comments) can
 * precede the frame — WhatsApp exports in this project's assets folder carry
 * several.
 */
function readJpeg(buf) {
  if (buf.length < 4 || buf.readUInt16BE(0) !== 0xffd8) return null;

  let offset = 2;
  while (offset + 9 < buf.length) {
    // Markers are 0xFF followed by a type byte; 0xFF padding is legal filler.
    if (buf[offset] !== 0xff) { offset++; continue; }

    const marker = buf[offset + 1];
    if (marker === 0xff) { offset++; continue; }

    // SOF0-SOF15 carry dimensions, except DHT/JPG/DAC which share the range.
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { height: buf.readUInt16BE(offset + 5), width: buf.readUInt16BE(offset + 7) };
    }

    // Standalone markers carry no length payload.
    if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd9)) { offset += 2; continue; }

    const segmentLength = buf.readUInt16BE(offset + 2);
    if (segmentLength < 2) return null; // malformed — bail rather than loop forever
    offset += 2 + segmentLength;
  }

  return null;
}

module.exports = { readImageSize };
