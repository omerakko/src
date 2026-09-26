const express = require('express');
const path    = require('path');
const { getVariant } = require('../lib/imageVariants');
const { sniffImageMime } = require('../lib/imageMime');

const router = express.Router();

// ---------------------------------------------------------------------------
// GET /img/:width/:folder/:file  →  resized WebP of assets/:folder/:file
//
// URLs embed the width and upload names are unique, so a variant never
// changes once created: cache it for a year.
// ---------------------------------------------------------------------------
router.get('/img/:width/:folder/:file', async (req, res, next) => {
  try {
    const file = await getVariant(req.params.folder, req.params.file, Number(req.params.width));
    if (!file) return res.status(404).end();

    const headers = {};
    if (file.endsWith('.webp')) {
      headers['Content-Type'] = 'image/webp';
    } else if (!path.extname(file)) {
      // Fell back to an extensionless original — give it a real type.
      const mime = sniffImageMime(file);
      if (mime) headers['Content-Type'] = mime;
    }

    // dotfiles: the cache lives in a dot-directory, which sendFile hides by default.
    res.sendFile(file, { maxAge: '365d', immutable: true, dotfiles: 'allow', headers });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
