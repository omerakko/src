import { Component, OnDestroy, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { PaintingService } from '../../services/painting.service';
import { ARTIST_ID, SeoService } from '../../services/seo.service';
import { I18nService } from '../../i18n/i18n.service';
import { StringKey } from '../../i18n/strings';
import { Painting, PaintingDetail } from '../../models/painting.model';
import {
  artworkAlt, artworkDescription, artworkMeta, artworkPath, displayTitle, parseMedium, techniqueLabel
} from '../../models/artwork';
import { imageSrcset, imageUrl } from '../../models/image-url';
import { ImageModalComponent } from '../../components/image-modal/image-modal.component';

/**
 * One page per painting: /paintings/222-nature-at-the-edge (and /tr/…, /fr/…).
 * The leading id is what loads the work; the server 301-redirects any other
 * slug to the canonical one.
 */
@Component({
  selector: 'app-painting-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, ImageModalComponent],
  templateUrl: './painting-detail.component.html',
  styleUrl: './painting-detail.component.css'
})
export class PaintingDetailComponent implements OnInit, OnDestroy {
  private route           = inject(ActivatedRoute);
  private router          = inject(Router);
  private platformId      = inject(PLATFORM_ID);
  private paintingService = inject(PaintingService);
  private seo             = inject(SeoService);
  readonly i18n           = inject(I18nService);

  readonly email = 'orel.nilufer@gmail.com';
  readonly imageUrl    = imageUrl;
  readonly imageSrcset = imageSrcset;
  readonly thumbWidths = [480, 960] as const;

  p: PaintingDetail | null = null;
  notFound = false;
  modalVisible = false;

  private sub?: Subscription;

  t(key: StringKey) { return this.i18n.t(key); }
  title(p: Painting) { return displayTitle(p, this.i18n.lang()); }
  meta(p: Painting)  { return artworkMeta(p, this.i18n.lang()); }
  alt(p: Painting)   { return artworkAlt(p, this.i18n.lang()); }
  link(p: Painting)  { return this.i18n.link(artworkPath(p)); }
  ratio(p: Painting) { return p.imagewidth && p.imageheight ? `${p.imagewidth} / ${p.imageheight}` : '4 / 3'; }

  get size()        { return this.p ? parseMedium(this.p.medium).size : ''; }
  get technique()   { return this.p ? techniqueLabel(parseMedium(this.p.medium).technique, this.i18n.lang()) : ''; }
  get description() { return this.p ? artworkDescription(this.p, this.i18n.lang()) : ''; }
  /** The artist's own (English) text, shown on its own on TR/FR pages. */
  get ownText() { return this.p && this.i18n.lang() !== 'en' ? (this.p.description || '').trim() : ''; }
  get mailto() {
    if (!this.p) return `mailto:${this.email}`;
    const subject = `${this.t('art.subject')} ${this.title(this.p)} (${this.p.year}, #${this.p.id})`;
    return `mailto:${this.email}?subject=${encodeURIComponent(subject)}`;
  }

  ngOnInit() {
    // Prev/next reuse this component, so follow the slug as it changes.
    this.sub = this.route.paramMap.subscribe(params => {
      const id = parseInt(params.get('slug') ?? '', 10);
      this.load(id);
    });

    // First visit on a phone: show the swipe hint for a few seconds.
    if (isPlatformBrowser(this.platformId) && window.matchMedia('(max-width: 768px)').matches) {
      let seen = false;
      try { seen = localStorage.getItem('swipe-hint-seen') === '1'; } catch { /* storage blocked */ }
      if (!seen) {
        this.showHint = true;
        setTimeout(() => this.hideHint(), 4500);
      }
    }
  }

  ngOnDestroy() { this.sub?.unsubscribe(); }

  /**
   * Phones: swipe left/right on the painting for the next/previous work.
   * The image follows the finger so the gesture explains itself; a short
   * "Swipe" hint shows on the first painting page a visitor opens.
   */
  private touch: { x: number; y: number; horizontal: boolean | null } | null = null;
  dragX = 0;
  dragging = false;
  showHint = false;
  private justSwiped = false;

  swipeStart(e: TouchEvent) {
    const t = e.changedTouches[0];
    this.touch = { x: t.clientX, y: t.clientY, horizontal: null };
    this.dragging = true;
  }
  swipeMove(e: TouchEvent) {
    if (!this.touch || !this.p) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - this.touch.x, dy = t.clientY - this.touch.y;
    if (this.touch.horizontal === null && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
      this.touch.horizontal = Math.abs(dx) > Math.abs(dy);
    }
    if (!this.touch.horizontal) return; // vertical: let the page scroll
    // Resist at the ends of the collection.
    const blocked = (dx < 0 && !this.p.next) || (dx > 0 && !this.p.prev);
    this.dragX = blocked ? dx * 0.25 : dx;
  }
  swipeEnd(e: TouchEvent) {
    if (!this.touch || !this.p) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - this.touch.x;
    const horizontal = this.touch.horizontal;
    this.touch = null;
    this.dragging = false;
    if (horizontal && Math.abs(dx) > 60) {
      const target = dx < 0 ? this.p.next : this.p.prev;
      if (target) {
        this.justSwiped = true;
        this.hideHint();
        // Slide out; the next painting then slides in from the other side
        // (see load), with no snap-back of the old one in between.
        this.enterFrom = dx < 0 ? 1 : -1;
        this.dragX = -this.enterFrom * window.innerWidth;
        setTimeout(() => this.router.navigateByUrl(this.link(target)), 200);
        return;
      }
    }
    if (horizontal) this.justSwiped = Math.abs(dx) > 8;
    this.dragX = 0; // snap back
  }

  /** Side the next painting enters from after a swipe: 1 = right, -1 = left, 0 = none. */
  private enterFrom = 0;
  /** Neighbours fetched ahead of time so a swipe shows the next work at once. */
  private cache = new Map<number, PaintingDetail>();

  private prefetchNeighbours(p: PaintingDetail) {
    if (!isPlatformBrowser(this.platformId)) return;
    for (const n of [p.prev, p.next]) {
      if (!n) continue;
      const img = new Image();
      img.src = imageUrl(n.imageurl, 1600);
      if (!this.cache.has(n.id)) {
        this.paintingService.getById(n.id).subscribe({ next: d => this.cache.set(n.id, d), error: () => {} });
      }
    }
  }

  private show(p: PaintingDetail) {
    this.p = p;
    this.applySeo(p);
    this.prefetchNeighbours(p);
    if (this.enterFrom && isPlatformBrowser(this.platformId)) {
      // Park the new painting just off-screen without animation, then let it
      // glide to the centre on the next frame.
      this.dragging = true;
      this.dragX = this.enterFrom * window.innerWidth;
      this.enterFrom = 0;
      requestAnimationFrame(() => requestAnimationFrame(() => { this.dragging = false; this.dragX = 0; }));
    } else {
      this.dragX = 0;
    }
  }
  swipeCancel() { this.touch = null; this.dragging = false; this.dragX = 0; }

  openLarge() {
    if (this.justSwiped) { this.justSwiped = false; return; }
    this.modalVisible = true;
  }

  private hideHint() {
    this.showHint = false;
    try { localStorage.setItem('swipe-hint-seen', '1'); } catch { /* storage blocked */ }
  }

  private load(id: number) {
    this.notFound = false;
    this.modalVisible = false;
    this.justSwiped = false;
    if (!this.enterFrom) this.dragX = 0;
    if (!Number.isInteger(id)) { this.showNotFound(); return; }

    const cached = this.cache.get(id);
    if (cached) { this.show(cached); return; }

    this.paintingService.getById(id).subscribe({
      next: p => this.show(p),
      error: err => {
        if (err?.status !== 404) this.seo.markRenderError();
        this.showNotFound();
      }
    });
  }

  private showNotFound() {
    this.p = null;
    this.notFound = true;
    this.seo.setPage({ title: `${this.t('art.notFound')} | Nilüfer Örel`, description: this.t('art.notFound'), path: '/paintings' });
  }

  private applySeo(p: PaintingDetail) {
    const lang  = this.i18n.lang();
    const title = this.title(p);
    const path  = artworkPath(p);
    const desc  = artworkDescription(p, lang);

    this.seo.setPage({
      title: `${title} (${p.year}) – Nilüfer Örel | ${this.technique || this.t('nav.paintings')}`,
      description: desc.slice(0, 300),
      path,
      image: p.imageurl,
      type: 'article'
    });
    this.seo.setBreadcrumbs([
      { name: this.t('nav.paintings'), path: '/paintings' },
      { name: title, path }
    ]);
    this.seo.setJsonLd('schema-painting', {
      '@context': 'https://schema.org',
      '@type': 'VisualArtwork',
      'name': title,
      'url': this.seo.canonicalUrl(this.i18n.link(path)),
      'inLanguage': lang,
      'artform': 'Painting',
      'creator': { '@id': ARTIST_ID },
      'artMedium': this.technique || 'Mixed media',
      'dateCreated': String(p.year),
      'description': desc,
      'image': this.seo.absolute(p.imageurl),
      ...(this.size ? { 'size': this.size } : {}),
      'locationCreated': { '@type': 'Place', 'name': 'Bodrum, Muğla, Türkiye' },
      'offers': p.isavailable
        ? { '@type': 'Offer', 'availability': 'https://schema.org/InStock', 'priceCurrency': 'EUR', ...(p.price ? { 'price': p.price } : {}) }
        : { '@type': 'Offer', 'availability': 'https://schema.org/SoldOut' }
    });
  }
}
