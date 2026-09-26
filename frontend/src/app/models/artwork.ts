import { Painting } from './painting.model';

/**
 * Some works were saved with placeholder titles ('.', '..') or wrapped in
 * stray quotes. These helpers give search engines and screen readers a real
 * name without touching the database.
 */
export function artworkTitle(p: Pick<Painting, 'title'>): string {
  const t = (p.title ?? '').trim().replace(/^["'“”„]+|["'“”„]+$/g, '').trim();
  return t && !/^[.\s]+$/.test(t) ? t : 'Untitled';
}

/** Alt text: title, medium and year, attributed to the artist. */
export function artworkAlt(p: Pick<Painting, 'title' | 'medium' | 'year'>): string {
  const details = [p.medium, p.year].filter(Boolean).join(', ');
  return `${artworkTitle(p)}${details ? ` – ${details}` : ''}. Painting by Nilüfer Örel.`;
}
