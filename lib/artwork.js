/**
 * Server copy of the painting title/slug rules.
 * KEEP IN SYNC with frontend/src/app/models/artwork.ts — the server
 * redirects any painting URL whose slug differs from artworkSlug().
 */
function artworkTitle(title) {
  const t = String(title ?? '').trim().replace(/^["'“”„]+|["'“”„]+$/g, '').trim();
  return t && !/^[.\s]+$/.test(t) && !/^(no title|untitled)$/i.test(t) ? t : 'Untitled';
}

function slugify(s) {
  const map = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u' };
  return s.toLowerCase()
    .replace(/[çğıöşü]/g, c => map[c])
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '');
}

function artworkSlug(p) {
  const title = artworkTitle(p.title);
  const base = slugify(title) || 'painting';
  return title === 'Untitled' ? `${p.id}-${base}-${p.year}` : `${p.id}-${base}`;
}

module.exports = { artworkTitle, artworkSlug, slugify };
