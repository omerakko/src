import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ExhibitionService } from '../../services/exhibition.service';
import { ARTIST_ID, SeoService } from '../../services/seo.service';
import { Exhibition } from '../../models/exhibition.model';
import { imageSrcset, imageUrl } from '../../models/image-url';

@Component({
  selector: 'app-exhibitions',
  standalone: true,
  imports: [CommonModule, DatePipe, RouterLink],
  templateUrl: './exhibitions.component.html',
  styleUrl: './exhibitions.component.css'
})
export class ExhibitionsComponent implements OnInit {
  private exhibitionService = inject(ExhibitionService);
  private seo               = inject(SeoService);

  exhibitions: Exhibition[] = [];
  sortBy    = 'date';
  sortOrder = 'desc';

  readonly imageUrl    = imageUrl;
  readonly imageSrcset = imageSrcset;

  ngOnInit() {
    this.seo.setPage({
      title: 'Exhibitions – Nilüfer Örel | Sergiler: İzmir, Istanbul, New York, Bodrum',
      description: 'Exhibition history of Turkish painter Nilüfer Örel: International İzmir Art Biennial, IAAF İzmir Art Fair, Awita Gallery New York, Bodrum Art Fair, DenizBank Art Gallery and more. Nilüfer Örel\'in Türkiye ve yurt dışındaki sergileri.',
      path: '/exhibitions'
    });
    this.seo.setBreadcrumbs([{ name: 'Exhibitions', path: '/exhibitions' }]);
    this.loadExhibitions();
  }

  loadExhibitions() {
    this.exhibitionService.getAll(this.sortBy, this.sortOrder).subscribe(res => {
      this.exhibitions = res.exhibitions;
      this.injectSchema(res.exhibitions);
    });
  }

  onSortChange(value: string) {
    const [sortBy, sortOrder] = value.split('-');
    this.sortBy    = sortBy;
    this.sortOrder = sortOrder;
    this.loadExhibitions();
  }

  private injectSchema(list: Exhibition[]) {
    this.seo.setJsonLd('schema-exhibitions', {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      'name': 'Exhibitions of Nilüfer Örel',
      'itemListElement': list.map((ex, i) => ({
        '@type': 'ListItem',
        'position': i + 1,
        'item': {
          '@type': 'ExhibitionEvent',
          'name': ex.title,
          'url': this.seo.canonicalUrl(`/exhibitions/${ex.id}`),
          ...(ex.date ? { 'startDate': ex.date.slice(0, 10) } : {}),
          ...(ex.location ? { 'location': { '@type': 'Place', 'name': ex.location.replace(/\s*\/\s*/g, ', ') } } : {}),
          ...(ex.photos?.[0] ? { 'image': this.seo.absolute(ex.photos[0].imageurl) } : {}),
          'performer': { '@id': ARTIST_ID }
        }
      }))
    });
  }
}
