import { Painting } from './painting.model';
import type { Lang } from '../i18n/i18n.service';

/**
 * Some works were saved with placeholder titles ('.', '..', 'no title') or
 * wrapped in stray quotes. These helpers give search engines, screen readers
 * and the page a real name without touching the database.
 *
 * KEEP IN SYNC with lib/artwork.js on the server: both must produce the same
 * slug or the server will redirect a valid painting URL.
 */
export function artworkTitle(p: Pick<Painting, 'title'>): string {
  const t = (p.title ?? '').trim().replace(/^["'“”„]+|["'“”„]+$/g, '').trim();
  return t && !/^[.\s]+$/.test(t) && !/^(no title|untitled)$/i.test(t) ? t : 'Untitled';
}

export function isUntitled(p: Pick<Painting, 'title'>): boolean {
  return artworkTitle(p) === 'Untitled';
}

const UNTITLED: Record<Lang, string> = { en: 'Untitled', tr: 'İsimsiz', fr: 'Sans titre' };

export function displayTitle(p: Pick<Painting, 'title'>, lang: Lang = 'en'): string {
  return isUntitled(p) ? UNTITLED[lang] : artworkTitle(p);
}

/**
 * The medium field often starts with the size: "120 X 170 mixed media on
 * canvas", "100 X 100mixed media on canvas". Split it into a size in cm and
 * a normalised technique.
 */
export function parseMedium(medium: string | null | undefined): { size: string; technique: string } {
  const raw = (medium ?? '').trim();
  const m = raw.match(/^(\d+(?:[.,]\d+)?)\s*[xX×*]\s*(\d+(?:[.,]\d+)?)\s*(?:cm)?\s*(.*)$/);
  const size = m ? `${m[1]} × ${m[2]} cm` : '';
  let technique = (m ? m[3] : raw).replace(/["”]+$/, '').trim();
  technique = technique.replace(/\b(ın|in)\s+canvas\b/i, 'on canvas');
  return { size, technique };
}

const TECHNIQUE_LABELS: Record<string, Record<Lang, string>> = {
  'mixed media on canvas': { en: 'Mixed media on canvas', tr: 'Tuval üzerine karma teknik', fr: 'Technique mixte sur toile' },
  'mixed media on wood':   { en: 'Mixed media on wood',   tr: 'Ahşap üzerine karma teknik', fr: 'Technique mixte sur bois' },
  'mixed media on paper':  { en: 'Mixed media on paper',  tr: 'Kâğıt üzerine karma teknik', fr: 'Technique mixte sur papier' },
  'mixed media':           { en: 'Mixed media',           tr: 'Karma teknik',               fr: 'Technique mixte' },
  'oil on canvas':         { en: 'Oil on canvas',         tr: 'Tuval üzerine yağlıboya',    fr: 'Huile sur toile' },
  'acrylic on canvas':     { en: 'Acrylic on canvas',     tr: 'Tuval üzerine akrilik',      fr: 'Acrylique sur toile' },
  'pastel on paper':       { en: 'Pastel on paper',       tr: 'Kâğıt üzerine pastel',       fr: 'Pastel sur papier' },
};

export function techniqueLabel(technique: string, lang: Lang = 'en'): string {
  const known = TECHNIQUE_LABELS[technique.toLowerCase()];
  if (known) return known[lang];
  return technique ? technique.charAt(0).toUpperCase() + technique.slice(1) : '';
}

/** "120 × 170 cm · Mixed media on canvas · 2026" in the page language. */
export function artworkMeta(p: Pick<Painting, 'medium' | 'year'>, lang: Lang = 'en'): string {
  const { size, technique } = parseMedium(p.medium);
  return [size, techniqueLabel(technique, lang), p.year].filter(Boolean).join(' · ');
}

const BY: Record<Lang, string> = { en: 'Painting by Nilüfer Örel.', tr: 'Nilüfer Örel tablosu.', fr: 'Peinture de Nilüfer Örel.' };

/** Alt text: title, size, technique and year, attributed to the artist. */
export function artworkAlt(p: Pick<Painting, 'title' | 'medium' | 'year'>, lang: Lang = 'en'): string {
  const details = artworkMeta(p, lang).replace(/ · /g, ', ');
  return `${displayTitle(p, lang)}${details ? ` – ${details}` : ''}. ${BY[lang]}`;
}

export function slugify(s: string): string {
  const map: Record<string, string> = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u' };
  return s.toLowerCase()
    .replace(/[çğıöşü]/g, c => map[c])
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '');
}

/** "222-nature-at-the-edge", "223-untitled-2026": id first, so it always resolves. */
export function artworkSlug(p: Pick<Painting, 'id' | 'title' | 'year'>): string {
  const base = slugify(artworkTitle(p)) || 'painting';
  return isUntitled(p) ? `${p.id}-${base}-${p.year}` : `${p.id}-${base}`;
}

export function artworkPath(p: Pick<Painting, 'id' | 'title' | 'year'>): string {
  return `/paintings/${artworkSlug(p)}`;
}

/** Text for the painting page when the artist hasn't written one yet. */
export function artworkDescription(p: Pick<Painting, 'title' | 'medium' | 'year' | 'description'>, lang: Lang = 'en'): string {
  if (p.description && p.description.trim() && lang === 'en') return p.description.trim();
  const { size, technique } = parseMedium(p.medium);
  const tech = techniqueLabel(technique, lang) || techniqueLabel('mixed media', lang);
  const t = displayTitle(p, lang);
  switch (lang) {
    case 'tr':
      return `${t} (${p.year}), çağdaş Türk ressam Nilüfer Örel'in Bodrum yakınlarındaki atölyesinde ürettiği özgün bir eserdir: ${tech.toLowerCase()}${size ? `, ${size}` : ''}.`;
    case 'fr':
      return `${t} (${p.year}) est une œuvre originale de la peintre contemporaine turque Nilüfer Örel, réalisée dans son atelier près de Bodrum : ${tech.toLowerCase()}${size ? `, ${size}` : ''}.`;
    default:
      return `${t} (${p.year}) is an original work by Turkish contemporary painter Nilüfer Örel, made in her studio near Bodrum: ${tech.toLowerCase()}${size ? `, ${size}` : ''}.`;
  }
}
