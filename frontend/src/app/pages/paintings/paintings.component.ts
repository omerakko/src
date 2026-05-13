import { Component, HostListener, OnInit, inject } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { Title, Meta } from '@angular/platform-browser';
import { PaintingService } from '../../services/painting.service';
import { Painting } from '../../models/painting.model';
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
  private titleService    = inject(Title);
  private meta            = inject(Meta);
  private document        = inject(DOCUMENT);

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

  ngOnInit() {
    this.titleService.setTitle('Tablolar | Nilüfer Örel – Ressam, Bodrum');
    this.meta.updateTag({ name: 'description', content: 'Nilüfer Örel\'in özgün tablolarını keşfedin. Yağlıboya, akrilik ve karma teknik eserler. Original paintings by Turkish artist based in Bodrum.' });
    this.setCanonical('https://orelnilufer.com/paintings');

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
    this.modalCaption = `${painting.title} — ${painting.medium}, ${painting.year}`;
    this.modalVisible = true;
  }

  closeModal() { this.modalVisible = false; }

  private setCanonical(url: string) {
    let link = this.document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!link) {
      link = this.document.createElement('link');
      link.rel = 'canonical';
      this.document.head.appendChild(link);
    }
    link.href = url;
  }

  private injectPaintingsSchema(paintings: Painting[]) {
    const existing = this.document.getElementById('schema-paintings');
    if (existing) existing.remove();

    const schema = {
      '@context': 'https://schema.org',
      '@graph': paintings.map(p => ({
        '@type': 'VisualArtwork',
        'name': p.title,
        'creator': { '@type': 'Person', 'name': 'Nilüfer Örel', 'url': 'https://orelnilufer.com' },
        'artMedium': p.medium || 'Mixed Media',
        'dateCreated': String(p.year),
        'locationCreated': { '@type': 'Place', 'name': 'Bodrum, Muğla, Turkey' },
        'image': `https://orelnilufer.com${p.imageurl}`,
        ...(p.isavailable ? {
          'offers': {
            '@type': 'Offer',
            'availability': 'https://schema.org/InStock',
            'priceCurrency': 'EUR',
            ...(p.price ? { 'price': p.price } : {})
          }
        } : { 'offers': { '@type': 'Offer', 'availability': 'https://schema.org/SoldOut' } })
      }))
    };

    const script = this.document.createElement('script');
    script.type = 'application/ld+json';
    script.id   = 'schema-paintings';
    script.text = JSON.stringify(schema);
    this.document.head.appendChild(script);
  }
}
