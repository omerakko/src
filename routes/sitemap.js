const express  = require('express');
const { Op }   = require('sequelize');
const { Painting, Exhibition, ExhibitionPhoto } = require('../models');
const { artworkTitle, artworkSlug } = require('../lib/artwork');

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
// Each page exists in three languages: English at the root, Turkish and French
// under /tr and /fr. Every <url> lists all three as alternates (hreflang) so
// Google shows searchers the version in their language.
const LANGS = ['en', 'tr', 'fr'];
const localized = (lang, path) => lang === 'en' ? path : (path === '/' ? `/${lang}` : `/${lang}${path}`);

router.get('/sitemap.xml', async (_req, res) => {
  try {
    const [latestPainting, exhibitions, paintings] = await Promise.all([
      Painting.max('updatedAt'),
      Exhibition.findAll({ attributes: ['id', 'updatedAt'], order: [['date', 'DESC']] }),
      Painting.findAll({ attributes: ['id', 'title', 'year', 'updatedAt'], order: [['order', 'DESC']] })
    ]);

    const latestExhibition = exhibitions.reduce(
      (max, ex) => (!max || ex.updatedAt > max ? ex.updatedAt : max), null);

    const pages = [
      { path: '/',            lastmod: newest(latestPainting, latestExhibition), changefreq: 'weekly',  priority: '1.0' },
      { path: '/paintings',   lastmod: latestPainting,                            changefreq: 'weekly',  priority: '0.9' },
      { path: '/exhibitions', lastmod: latestExhibition,                          changefreq: 'monthly', priority: '0.8' },
      { path: '/about',                                                           changefreq: 'monthly', priority: '0.7' },
      ...paintings.map(p => ({
        path: `/paintings/${artworkSlug(p)}`, lastmod: p.updatedAt, changefreq: 'monthly', priority: '0.7'
      })),
      ...exhibitions.map(ex => ({
        path: `/exhibitions/${ex.id}`, lastmod: ex.updatedAt, changefreq: 'yearly', priority: '0.6'
      }))
    ];

    const alternates = path => [
      ...LANGS.map(l => `    <xhtml:link rel="alternate" hreflang="${l}" href="${BASE}${localized(l, path)}"/>`),
      `    <xhtml:link rel="alternate" hreflang="x-default" href="${BASE}${path}"/>`
    ].join('\n');

    const urls = pages.flatMap(p => LANGS.map(lang => `  <url>
    <loc>${BASE}${localized(lang, p.path)}</loc>${p.lastmod ? `
    <lastmod>${isoDate(p.lastmod)}</lastmod>` : ''}
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
${alternates(p.path)}
  </url>`));

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join('\n')}
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
        attributes: ['id', 'title', 'imageurl', 'medium', 'year'],
        order:      [['order', 'DESC']]
      }),
      Exhibition.findAll({
        attributes: ['id', 'title', 'location'],
        include: [{ model: ExhibitionPhoto, as: 'photos', attributes: ['imageurl', 'title'] }]
      })
    ]);

    const urls = [];

    // Each painting image belongs to its own page.
    for (const p of paintings.filter(p => p.imageurl)) {
      urls.push(`
  <url>
    <loc>${BASE}/paintings/${artworkSlug(p)}</loc>
    <image:image>
      <image:loc>${BASE}${escXml(encodePath(p.imageurl))}</image:loc>
      <image:title>${escXml(artworkTitle(p.title))}${p.medium ? ` — ${escXml(p.medium)}` : ''}, ${escXml(String(p.year))} — painting by Nilüfer Örel</image:title>
      <image:caption>Original painting by Turkish contemporary artist Nilüfer Örel, Bodrum, Türkiye</image:caption>
    </image:image>
  </url>`);
    }

    for (const ex of exhibitions) {
      const photos = (ex.photos || []).filter(ph => ph.imageurl);
      if (!photos.length) continue;

      const where = ex.location ? `, ${escXml(ex.location)}` : '';
      const photoImages = photos.map(ph => `
    <image:image>
      <image:loc>${BASE}${escXml(encodePath(ph.imageurl))}</image:loc>
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

// Older upload names contain spaces, which are invalid in a sitemap <loc>.
function encodePath(p) {
  return p.includes('%') ? p : encodeURI(p);
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
