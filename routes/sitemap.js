const express  = require('express');
const { Op }   = require('sequelize');
const { Painting, Exhibition, ExhibitionPhoto } = require('../models');

const router = express.Router();

const BASE = 'https://orelnilufer.com';

// Everything here is generated from the database so a new exhibition or
// painting shows up for Google without a redeploy. One-hour cache: crawlers
// re-read sitemaps far less often than that anyway.
const CACHE = 'public, max-age=3600';

// ---------------------------------------------------------------------------
// GET /robots.txt
// ---------------------------------------------------------------------------
router.get('/robots.txt', (_req, res) => {
  res.type('text/plain').setHeader('Cache-Control', CACHE);
  res.send([
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin',
    'Disallow: /login',
    'Disallow: /api/',
    '',
    `Sitemap: ${BASE}/sitemap.xml`,
    `Sitemap: ${BASE}/sitemap-images.xml`,
    ''
  ].join('\n'));
});

// ---------------------------------------------------------------------------
// GET /sitemap.xml — every indexable page with a real last-modified date.
// ---------------------------------------------------------------------------
router.get('/sitemap.xml', async (_req, res) => {
  try {
    const [latestPainting, exhibitions] = await Promise.all([
      Painting.max('updatedAt'),
      Exhibition.findAll({ attributes: ['id', 'updatedAt'], order: [['date', 'DESC']] })
    ]);

    const latestExhibition = exhibitions.reduce(
      (max, ex) => (!max || ex.updatedAt > max ? ex.updatedAt : max), null);

    const urls = [
      { loc: '/',            lastmod: newest(latestPainting, latestExhibition), changefreq: 'weekly',  priority: '1.0' },
      { loc: '/paintings',   lastmod: latestPainting,                            changefreq: 'weekly',  priority: '0.9' },
      { loc: '/exhibitions', lastmod: latestExhibition,                          changefreq: 'monthly', priority: '0.8' },
      { loc: '/about',                                                           changefreq: 'monthly', priority: '0.7' },
      ...exhibitions.map(ex => ({
        loc: `/exhibitions/${ex.id}`, lastmod: ex.updatedAt, changefreq: 'yearly', priority: '0.6'
      }))
    ];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${BASE}${u.loc}</loc>${u.lastmod ? `
    <lastmod>${isoDate(u.lastmod)}</lastmod>` : ''}
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', CACHE);
    res.send(xml);
  } catch (err) {
    console.error('[sitemap]', err);
    res.status(500).send('Error generating sitemap');
  }
});

// ---------------------------------------------------------------------------
// GET /sitemap-images.xml — tells Google Images which page each painting and
// exhibition photo belongs to, with a descriptive title and caption.
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
        attributes: ['id', 'title', 'location'],
        include: [{ model: ExhibitionPhoto, as: 'photos', attributes: ['imageurl', 'title'] }]
      })
    ]);

    const urls = [];

    const paintingImages = paintings
      .filter(p => p.imageurl)
      .map(p => `
    <image:image>
      <image:loc>${BASE}${escXml(p.imageurl)}</image:loc>
      <image:title>${escXml(artworkTitle(p.title))}${p.medium ? ` — ${escXml(p.medium)}` : ''}, ${escXml(String(p.year))} — painting by Nilüfer Örel</image:title>
      <image:caption>Original painting by Turkish contemporary artist Nilüfer Örel, Bodrum, Türkiye</image:caption>
    </image:image>`).join('');

    if (paintingImages) {
      urls.push(`
  <url>
    <loc>${BASE}/paintings</loc>${paintingImages}
  </url>`);
    }

    for (const ex of exhibitions) {
      const photos = (ex.photos || []).filter(ph => ph.imageurl);
      if (!photos.length) continue;

      const where = ex.location ? `, ${escXml(ex.location)}` : '';
      const photoImages = photos.map(ph => `
    <image:image>
      <image:loc>${BASE}${escXml(ph.imageurl)}</image:loc>
      <image:title>${escXml(ph.title || ex.title)} — Nilüfer Örel</image:title>
      <image:caption>${escXml(ex.title)}${where} — exhibition with paintings by Nilüfer Örel</image:caption>
    </image:image>`).join('');

      urls.push(`
  <url>
    <loc>${BASE}/exhibitions/${ex.id}</loc>${photoImages}
  </url>`);
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls.join('\n')}
</urlset>`;

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', CACHE);
    res.send(xml);
  } catch (err) {
    console.error('[sitemap-images]', err);
    res.status(500).send('Error generating sitemap');
  }
});

// Mirrors frontend/src/app/models/artwork.ts: placeholder titles ('.', '..')
// and stray quotes become "Untitled" / a clean name.
function artworkTitle(title) {
  const t = String(title ?? '').trim().replace(/^["'“”„]+|["'“”„]+$/g, '').trim();
  return t && !/^[.\s]+$/.test(t) ? t : 'Untitled';
}

function newest(a, b) {
  if (!a) return b;
  if (!b) return a;
  return a > b ? a : b;
}

function isoDate(d) {
  return new Date(d).toISOString().slice(0, 10);
}

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
