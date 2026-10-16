import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
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
  }

  ngOnDestroy() { this.sub?.unsubscribe(); }

  /** Phones: swipe left/right on the painting for the next/previous work. */
  private touch: { x: number; y: number } | null = null;
  swipeStart(e: TouchEvent) {
    const t = e.changedTouches[0];
    this.touch = { x: t.clientX, y: t.clientY };
  }
  swipeEnd(e: TouchEvent) {
    if (!this.touch || !this.p) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - this.touch.x, dy = t.clientY - this.touch.y;
    this.touch = null;
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return; // a tap or a scroll
    const target = dx < 0 ? this.p.next : this.p.prev;
    if (target) {
      e.preventDefault(); // don't also open the enlarged view
      this.router.navigateByUrl(this.link(target));
    }
  }

  private load(id: number) {
    this.notFound = false;
    this.modalVisible = false;
    if (!Number.isInteger(id)) { this.showNotFound(); return; }

    this.paintingService.getById(id).subscribe({
      next: p => { this.p = p; this.applySeo(p); },
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
