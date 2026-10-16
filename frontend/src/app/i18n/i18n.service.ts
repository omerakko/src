import { Injectable, inject, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { NavigationEnd, ResolveEnd, Router } from '@angular/router';
import { STRINGS, StringKey } from './strings';

export type Lang = 'en' | 'tr' | 'fr';
export const LANGS: Lang[] = ['en', 'tr', 'fr'];
export const DEFAULT_LANG: Lang = 'en';
export const LANG_LABELS: Record<Lang, string> = { en: 'EN', tr: 'TR', fr: 'FR' };
export const LOCALES: Record<Lang, string> = { en: 'en_US', tr: 'tr_TR', fr: 'fr_FR' };

/**
 * Splits a URL into its language and the language-neutral path.
 * English lives at the root (the URLs Google already indexed); Turkish and
 * French under /tr and /fr with the same path segments.
 */
export function splitLangPath(url: string): { lang: Lang; path: string } {
  const clean = (url || '/').split(/[?#]/)[0];
  const m = clean.match(/^\/(tr|fr)(?=\/|$)(.*)$/);
  if (m) return { lang: m[1] as Lang, path: m[2] || '/' };
  return { lang: 'en', path: clean || '/' };
}

export function localizedPath(lang: Lang, path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  if (lang === DEFAULT_LANG) return p;
  return p === '/' ? `/${lang}` : `/${lang}${p}`;
}

/**
 * Current language for the whole app. Set from the URL before each route
 * activates (ResolveEnd), so a page's ngOnInit already sees the right
 * language, during server rendering as well as in the browser.
 */
@Injectable({ providedIn: 'root' })
export class I18nService {
  private router = inject(Router);
  private doc    = inject(DOCUMENT);

  readonly lang = signal<Lang>(DEFAULT_LANG);
  /** Language-neutral path of the current page, e.g. '/paintings'. */
  readonly path = signal<string>('/');

  constructor() {
    this.router.events.subscribe(e => {
      if (e instanceof ResolveEnd || e instanceof NavigationEnd) {
        this.apply(e instanceof ResolveEnd ? e.urlAfterRedirects : e.urlAfterRedirects);
      }
    });
  }

  private apply(url: string) {
    const { lang, path } = splitLangPath(url);
    this.lang.set(lang);
    this.path.set(path);
    this.doc.documentElement.lang = lang;
  }

  t(key: StringKey): string {
    return STRINGS[this.lang()][key] ?? STRINGS.en[key] ?? key;
  }

  /** '/paintings' → '/tr/paintings' when the page is Turkish. */
  link(path: string): string {
    return localizedPath(this.lang(), path);
  }

  /** "May 2026" / "Mayıs 2026" / "mai 2026"; with day: "13 May 2026"… */
  date(iso: string | null | undefined, withDay = false): string {
    if (!iso) return '';
    const opts: Intl.DateTimeFormatOptions = { month: 'long', year: 'numeric', timeZone: 'UTC' };
    if (withDay) opts.day = 'numeric';
    try { return new Intl.DateTimeFormat(this.lang(), opts).format(new Date(iso)); }
    catch { return iso.slice(0, 10); }
  }

  /** The current page in another language (for the switcher). */
  switchTo(lang: Lang): string {
    return localizedPath(lang, this.path());
  }
}
