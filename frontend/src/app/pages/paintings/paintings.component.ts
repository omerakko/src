import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PaintingService } from '../../services/painting.service';
import { ARTIST_ID, SeoService } from '../../services/seo.service';
import { I18nService } from '../../i18n/i18n.service';
import { StringKey } from '../../i18n/strings';
import { Painting } from '../../models/painting.model';
import { artworkAlt, artworkMeta, artworkPath, displayTitle, parseMedium, techniqueLabel } from '../../models/artwork';
import { imageSrcset, imageUrl } from '../../models/image-url';

@Component({
  selector: 'app-paintings',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './paintings.component.html',
  styleUrl: './paintings.component.css'
})
export class PaintingsComponent implements OnInit {
  private paintingService = inject(PaintingService);
  private seo             = inject(SeoService);
  private i18n            = inject(I18nService);

  paintings: Painting[] = [];
  loading = false;

  /**
   * The whole collection is fetched in one request rather than paged in on
   * scroll. Appending works to a justified flex grid re-lays out its last
   * row (every item in it changes height), which scored a CLS of 3.5 over a
   * full scroll. Images are lazy-loaded, so the page weight is unchanged, and
   * search engines get every work in the HTML instead of the first six.
   */
  readonly pageSize = 250;

  readonly imageUrl    = imageUrl;
  readonly imageSrcset = imageSrcset;

  /**
   * Target row height in px, before justification. Each work gets a
   * flex-basis of aspect x rowBase, so this really controls how many pieces
   * land per row — flexbox then stretches each row to fill the measure
   * exactly, and the final height falls out of that.
   */
  readonly rowBase = 380;

  t(key: StringKey) { return this.i18n.t(key); }
  title(p: Painting) { return displayTitle(p, this.i18n.lang()); }
  meta(p: Painting)  { return artworkMeta(p, this.i18n.lang()); }
  alt(p: Painting)   { return artworkAlt(p, this.i18n.lang()); }
  link(p: Painting)  { return this.i18n.link(artworkPath(p)); }

  /**
   * Width-to-height ratio of a work, driving its share of the row.
   *
   * Falls back to 4:3 when dimensions are missing so the layout still
   * composes; those rows will letterbox slightly rather than crop.
   */
  aspect(painting: Painting): number {
    if (painting.imagewidth && painting.imageheight) {
      return painting.imagewidth / painting.imageheight;
    }
    return 4 / 3;
  }

  ngOnInit() {
    this.seo.setPage({
      title: this.t('paintings.seoTitle'),
      description: this.t('paintings.seoDesc'),
      path: '/paintings'
    });
    this.seo.setBreadcrumbs([{ name: this.t('nav.paintings'), path: '/paintings' }]);
    this.loadPaintings();
  }

  loadPaintings() {
    if (this.loading) return;
    this.loading = true;

    this.paintingService.getPaintings({ page: 1, perPage: this.pageSize }).subscribe({
      next: res => {
        this.paintings = res.paintings;
        this.loading   = false;
        this.injectPaintingsSchema(this.paintings);
      },
      error: () => { this.loading = false; this.seo.markRenderError(); }
    });
  }

  /** The list page names each work and points to its own page. */
  private injectPaintingsSchema(paintings: Painting[]) {
    const lang = this.i18n.lang();
    this.seo.setJsonLd('schema-paintings', {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      'name': this.t('paintings.seoTitle'),
      'itemListElement': paintings.map((p, i) => ({
        '@type': 'ListItem',
        'position': i + 1,
        'url': this.seo.canonicalUrl(this.link(p)),
        'item': {
          '@type': 'VisualArtwork',
          'name': this.title(p),
          'url': this.seo.canonicalUrl(this.link(p)),
          'artform': 'Painting',
          'creator': { '@id': ARTIST_ID },
          'artMedium': techniqueLabel(parseMedium(p.medium).technique, lang) || 'Mixed media',
          'dateCreated': String(p.year),
          'image': this.seo.absolute(p.imageurl)
        }
      }))
    });
  }
}
