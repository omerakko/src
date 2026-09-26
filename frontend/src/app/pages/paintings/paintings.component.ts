import { Component, HostListener, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PaintingService } from '../../services/painting.service';
import { ARTIST_ID, SeoService } from '../../services/seo.service';
import { Painting } from '../../models/painting.model';
import { artworkAlt, artworkTitle } from '../../models/artwork';
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

  currentPage  = 1;
  readonly perPage = 6;
  hasNextPage  = false;
  loading      = false;

  modalImage   = '';
  modalCaption = '';
  modalVisible = false;

  readonly artworkAlt   = artworkAlt;
  readonly artworkTitle = artworkTitle;

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
    this.loadPaintings(true);
  }

  selectCategory(category: string) {
    if (this.selectedCategory === category) return;
    this.selectedCategory = category;
    this.currentPage = 1;
    this.paintings   = [];
    this.loadPaintings(true);
  }

  loadPaintings(reset = false) {
    if (this.loading) return;
    this.loading = true;

    this.paintingService.getPaintings({
      page:     this.currentPage,
      perPage:  this.perPage,
      category: this.selectedCategory
    }).subscribe({
      next: res => {
        this.paintings  = reset ? res.paintings : [...this.paintings, ...res.paintings];
        this.hasNextPage = res.hasNextPage;
        this.loading    = false;
        if (reset) this.injectPaintingsSchema(this.paintings);
      },
      error: () => { this.loading = false; }
    });
  }

  @HostListener('window:scroll')
  onScroll() {
    if (this.loading || !this.hasNextPage) return;
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 300) {
      this.currentPage++;
      this.loadPaintings();
    }
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
