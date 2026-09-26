import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PaintingService } from '../../services/painting.service';
import { ARTIST_ID, SeoService } from '../../services/seo.service';
import { Painting } from '../../models/painting.model';
import { artworkAlt, artworkTitle } from '../../models/artwork';
import { imageSrcset, imageUrl } from '../../models/image-url';
import { ImageModalComponent } from '../../components/image-modal/image-modal.component';

@Component({
  selector: 'app-paintings',
  standalone: true,
  imports: [CommonModule, ImageModalComponent],
  templateUrl: './paintings.component.html',
  styleUrl: './paintings.component.css'
})
export class PaintingsComponent implements OnInit {
  private paintingService = inject(PaintingService);
  private seo             = inject(SeoService);

  paintings: Painting[] = [];
  categories: string[] = ['All'];
  selectedCategory = 'All';
  loading = false;

  /**
   * The whole collection is fetched in one request rather than paged in on
   * scroll. Appending works to a justified flex grid re-lays out its last
   * row (every item in it changes height), which scored a CLS of 3.5 over a
   * full scroll. Images are lazy-loaded, so the page weight is unchanged, and
   * search engines get every work in the HTML instead of the first six.
   */
  readonly pageSize = 250;

  modalImage   = '';
  modalCaption = '';
  modalVisible = false;

  readonly artworkAlt   = artworkAlt;
  readonly artworkTitle = artworkTitle;
  readonly imageUrl     = imageUrl;
  readonly imageSrcset  = imageSrcset;

  /**
   * Target row height in px, before justification. Each work gets a
   * flex-basis of aspect x rowBase, so this really controls how many pieces
   * land per row — flexbox then stretches each row to fill the measure
   * exactly, and the final height falls out of that.
   */
  readonly rowBase = 380;

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
      title: 'Paintings by Nilüfer Örel – Mixed Media & Acrylic Works | Tablolar',
      description: 'Original paintings by Turkish contemporary artist Nilüfer Örel: mixed media, acrylic, pastel and oil on canvas, made in Bodrum. Nilüfer Örel\'in özgün tabloları: karma teknik, akrilik ve yağlıboya eserler.',
      path: '/paintings'
    });
    this.seo.setBreadcrumbs([{ name: 'Paintings', path: '/paintings' }]);

    this.paintingService.getCategories().subscribe(cats => {
      this.categories = ['All', ...cats];
    });
    this.loadPaintings();
  }

  selectCategory(category: string) {
    if (this.selectedCategory === category) return;
    this.selectedCategory = category;
    this.paintings = [];
    this.loadPaintings();
  }

  loadPaintings() {
    if (this.loading) return;
    this.loading = true;

    this.paintingService.getPaintings({
      page:     1,
      perPage:  this.pageSize,
      category: this.selectedCategory
    }).subscribe({
      next: res => {
        this.paintings = res.paintings;
        this.loading   = false;
        this.injectPaintingsSchema(this.paintings);
      },
      error: () => { this.loading = false; }
    });
  }

  openModal(painting: Painting) {
    this.modalImage   = painting.imageurl;
    this.modalCaption = `${artworkTitle(painting)} — ${painting.medium}, ${painting.year}`;
    this.modalVisible = true;
  }

  closeModal() { this.modalVisible = false; }

  private injectPaintingsSchema(paintings: Painting[]) {
    this.seo.setJsonLd('schema-paintings', {
      '@context': 'https://schema.org',
      '@graph': paintings.map(p => ({
        '@type': 'VisualArtwork',
        'name': artworkTitle(p),
        'artform': 'Painting',
        'creator': { '@id': ARTIST_ID },
        'artMedium': p.medium || 'Mixed media',
        'dateCreated': String(p.year),
        'locationCreated': { '@type': 'Place', 'name': 'Bodrum, Muğla, Türkiye' },
        'image': this.seo.absolute(p.imageurl),
        ...(p.description ? { 'description': p.description } : {}),
        'offers': p.isavailable
          ? {
              '@type': 'Offer',
              'availability': 'https://schema.org/InStock',
              'priceCurrency': 'EUR',
              ...(p.price ? { 'price': p.price } : {})
            }
          : { '@type': 'Offer', 'availability': 'https://schema.org/SoldOut' }
      }))
    });
  }
}
