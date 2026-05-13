const multer = require('multer');
const path   = require('path');
const fs     = require('fs').promises;

const UPLOAD_DIR = path.join(__dirname, '..', 'assets', 'images');

// Store files on disk with a collision-safe name.
// Using a time + random suffix is sufficient for this scale; a UUID library
// would be overkill and adds a dependency.
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename:    (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const extByMime = { 'image/webp': '.webp', 'image/png': '.png', 'image/gif': '.gif' };
    const ext = extByMime[file.mimetype] ?? path.extname(file.originalname) ?? '.jpg';
    cb(null, `image-${unique}${ext}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) return cb(null, true);
    cb(new Error('Only image files are allowed'));
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5 MB
});

/**
 * Deletes a file from the assets/images directory.
 *
 * Why not throw on ENOENT? The file might have been manually removed from
 * disk, the record might have been created before the image was uploaded, or
 * a previous delete attempt may have partially succeeded. In all those cases
 * the DB operation should still proceed — the goal is to clean up, not block.
 */
async function deleteImageFile(imageUrl) {
  if (!imageUrl || !imageUrl.startsWith('/assets/images/')) return;
  try {
    await fs.unlink(path.join(__dirname, '..', imageUrl));
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.warn(`[fileStorage] Could not delete ${imageUrl}:`, err.message);
    }
  }
}

module.exports = { upload, deleteImageFile };
