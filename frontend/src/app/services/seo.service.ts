import { Injectable, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';
import { I18nService, LANGS, LOCALES, localizedPath } from '../i18n/i18n.service';

export const SITE_URL      = 'https://orelnilufer.com';
export const SITE_NAME     = 'Nilüfer Örel';
export const ARTIST_ID     = `${SITE_URL}/#artist`;
export const DEFAULT_IMAGE = `${SITE_URL}/assets/images/image-1776261242741-933586901`;

export interface PageMeta {
  title: string;
  description: string;
  /** Site-relative path: '/', '/paintings', '/exhibitions/49' */
  path: string;
  /** Absolute or site-relative image for social previews. */
  image?: string;
  type?: 'website' | 'article' | 'profile';
}

/**
 * One place for everything a page tells search engines and social crawlers:
 * <title>, description, canonical, Open Graph / Twitter tags and JSON-LD.
 * Works identically during server rendering and in the browser because it
 * only touches the injected DOCUMENT.
 */
@Injectable({ providedIn: 'root' })
export class SeoService {
  private doc   = inject(DOCUMENT);
  private title = inject(Title);
  private meta  = inject(Meta);
  private i18n  = inject(I18nService);

  /**
   * `page.path` is language-neutral ('/paintings'); the canonical URL, the
   * hreflang alternates and og:locale follow the current page language.
   */
  setPage(page: PageMeta) {
    const lang  = this.i18n.lang();
    const url   = this.canonicalUrl(localizedPath(lang, page.path));
    const image = this.absolute(page.image ?? DEFAULT_IMAGE);
    this.setAlternates(page.path);
    this.meta.updateTag({ property: 'og:locale', content: LOCALES[lang] });

    this.title.setTitle(page.title);
    this.meta.updateTag({ name: 'description', content: page.description });

    this.meta.updateTag({ property: 'og:title',       content: page.title });
    this.meta.updateTag({ property: 'og:description', content: page.description });
    this.meta.updateTag({ property: 'og:url',         content: url });
    this.meta.updateTag({ property: 'og:image',       content: image });
    this.meta.updateTag({ property: 'og:type',        content: page.type ?? 'website' });

    this.meta.updateTag({ name: 'twitter:title',       content: page.title });
    this.meta.updateTag({ name: 'twitter:description', content: page.description });
    this.meta.updateTag({ name: 'twitter:image',       content: image });

    this.setCanonical(url);
  }

  /**
   * Flags that a data request failed while this page was rendering. The
   * server checks for the tag: such a render is never cached and is sent
   * with a 503 so crawlers retry later instead of indexing an empty page.
   * In the browser the tag is inert.
   */
  markRenderError() {
    this.meta.updateTag({ name: 'x-render-error', content: '1' });
  }

  /** Inserts (or replaces) a JSON-LD block identified by `id`. */
  setJsonLd(id: string, data: object) {
    this.removeJsonLd(id);
    const script = this.doc.createElement('script');
    script.type = 'application/ld+json';
    script.id   = id;
    script.text = JSON.stringify(data);
    this.doc.head.appendChild(script);
  }

  removeJsonLd(id: string) {
    this.doc.getElementById(id)?.remove();
  }

  /** <link rel="alternate" hreflang> for every language, plus x-default (English). */
  private setAlternates(path: string) {
    this.doc.head.querySelectorAll('link[rel="alternate"][hreflang]').forEach(l => l.remove());
    const add = (hreflang: string, href: string) => {
      const link = this.doc.createElement('link');
      link.rel = 'alternate';
      link.setAttribute('hreflang', hreflang);
      link.href = href;
      this.doc.head.appendChild(link);
    };
    for (const l of LANGS) add(l, this.canonicalUrl(localizedPath(l, path)));
    add('x-default', this.canonicalUrl(path));
  }

  /**
   * Breadcrumb trail for sub-pages; the home crumb is added automatically.
   * Paths are language-neutral and names already in the page language.
   */
  setBreadcrumbs(items: { name: string; path: string }[]) {
    const lang = this.i18n.lang();
    const crumbs = [{ name: this.i18n.t('crumb.home'), path: '/' }, ...items]
      .map(c => ({ ...c, path: localizedPath(lang, c.path) }));
    this.setJsonLd('schema-breadcrumb', {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      'itemListElement': crumbs.map((c, i) => ({
        '@type': 'ListItem',
        'position': i + 1,
        'name': c.name,
        'item': this.canonicalUrl(c.path),
      })),
    });
  }

  /**
   * Absolute URL for meta tags and JSON-LD. Older upload names contain
   * spaces, which are not valid in a URL there; encode unless the value is
   * already percent-encoded.
   */
  absolute(url: string): string {
    const full = /^https?:\/\//.test(url) ? url : SITE_URL + (url.startsWith('/') ? url : `/${url}`);
    return full.includes('%') ? full : encodeURI(full);
  }

  canonicalUrl(path: string): string {
    if (path === '/' || path === '') return `${SITE_URL}/`;
    return SITE_URL + path.replace(/\/+$/, '');
  }

  private setCanonical(url: string) {
    let link = this.doc.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!link) {
      link = this.doc.createElement('link');
      link.rel = 'canonical';
      this.doc.head.appendChild(link);
    }
    link.href = url;
  }
}
