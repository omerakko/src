const express  = require('express');
const { Op }   = require('sequelize');
const { Painting, Exhibition, ExhibitionPhoto } = require('../models');

const router = express.Router();

const BASE = 'https://orelnilufer.com';

// ---------------------------------------------------------------------------
// GET /sitemap-images.xml
// Dynamically generated image sitemap — Google uses this to index individual
// painting and exhibition photos in Google Images Search.
// ---------------------------------------------------------------------------
router.get('/sitemap-images.xml', async (_req, res) => {
  try {
    const [paintings, exhibitions] = await Promise.all([
      Painting.findAll({
        where:      { imageurl: { [Op.ne]: null } },
        attributes: ['title', 'imageurl', 'medium', 'year'],
        order:      [['order', 'DESC']]
      }),
      Exhibition.findAll({
        attributes: ['title'],
        include: [{
          model:      ExhibitionPhoto,
          as:         'photos',
          attributes: ['imageurl', 'title']
        }]
      })
    ]);

    const urls = [];

    // Paintings page — one <url> with all painting images
    const paintingImages = paintings
      .filter(p => p.imageurl)
      .map(p => `
    <image:image>
      <image:loc>${BASE}${escXml(p.imageurl)}</image:loc>
      <image:title>${escXml(p.title)}${p.medium ? ` — ${escXml(p.medium)}` : ''}, ${escXml(String(p.year))} — Nilüfer Örel</image:title>
      <image:caption>Bodrum, Turkey</image:caption>
    </image:image>`).join('');

    if (paintingImages) {
      urls.push(`
  <url>
    <loc>${BASE}/paintings</loc>${paintingImages}
  </url>`);
    }

    // Exhibitions page — one <url> per exhibition with its photos
    for (const ex of exhibitions) {
      const photos = (ex.photos || []).filter(ph => ph.imageurl);
      if (!photos.length) continue;

      const photoImages = photos.map(ph => `
    <image:image>
      <image:loc>${BASE}${escXml(ph.imageurl)}</image:loc>
      <image:title>${escXml(ph.title || ex.title)} — Nilüfer Örel</image:title>
      <image:caption>${escXml(ex.title)}, Bodrum, Turkey</image:caption>
    </image:image>`).join('');

      urls.push(`
  <url>
    <loc>${BASE}/exhibitions</loc>${photoImages}
  </url>`);
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls.join('\n')}
</urlset>`;

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // 1-hour cache
    res.send(xml);

  } catch (err) {
    console.error('[sitemap-images]', err);
    res.status(500).send('Error generating sitemap');
  }
});

function escXml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

module.exports = router;
