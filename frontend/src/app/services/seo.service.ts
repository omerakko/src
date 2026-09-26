import { Injectable, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';

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

  setPage(page: PageMeta) {
    const url   = this.canonicalUrl(page.path);
    const image = this.absolute(page.image ?? DEFAULT_IMAGE);

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

  /** Breadcrumb trail for sub-pages; the home crumb is added automatically. */
  setBreadcrumbs(items: { name: string; path: string }[]) {
    const crumbs = [{ name: 'Home', path: '/' }, ...items];
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

  absolute(url: string): string {
    if (/^https?:\/\//.test(url)) return url;
    return SITE_URL + (url.startsWith('/') ? url : `/${url}`);
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
