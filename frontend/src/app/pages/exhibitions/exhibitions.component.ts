import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ExhibitionService } from '../../services/exhibition.service';
import { ARTIST_ID, SeoService } from '../../services/seo.service';
import { Exhibition } from '../../models/exhibition.model';
import { imageSrcset, imageUrl } from '../../models/image-url';
import { I18nService } from '../../i18n/i18n.service';
import { StringKey } from '../../i18n/strings';
import { CV, Country } from '../../i18n/content';

@Component({
  selector: 'app-exhibitions',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './exhibitions.component.html',
  styleUrl: './exhibitions.component.css'
})
export class ExhibitionsComponent implements OnInit {
  private exhibitionService = inject(ExhibitionService);
  private seo               = inject(SeoService);
  readonly i18n             = inject(I18nService);
  readonly cv               = CV;

  exhibitions: Exhibition[] = [];
  sortBy    = 'date';
  sortOrder = 'desc';

  readonly imageUrl    = imageUrl;
  readonly imageSrcset = imageSrcset;

  t(key: StringKey) { return this.i18n.t(key); }
  country(c: Country) { return this.t(('country.' + c) as StringKey); }

  ngOnInit() {
    this.seo.setPage({
      title: this.t('ex.seoTitle'),
      description: this.t('ex.seoDesc'),
      path: '/exhibitions'
    });
    this.seo.setBreadcrumbs([{ name: this.t('nav.exhibitions'), path: '/exhibitions' }]);
    this.loadExhibitions();
  }

  loadExhibitions() {
    this.exhibitionService.getAll(this.sortBy, this.sortOrder).subscribe({
      next: res => {
        this.exhibitions = res.exhibitions;
        this.injectSchema(res.exhibitions);
      },
      error: () => this.seo.markRenderError()
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
      'name': this.t('ex.seoTitle'),
      'itemListElement': list.map((ex, i) => ({
        '@type': 'ListItem',
        'position': i + 1,
        'item': {
          '@type': 'ExhibitionEvent',
          'name': ex.title,
          'url': this.seo.canonicalUrl(this.i18n.link(`/exhibitions/${ex.id}`)),
          ...(ex.date ? { 'startDate': ex.date.slice(0, 10) } : {}),
          ...(ex.location ? { 'location': { '@type': 'Place', 'name': ex.location.replace(/\s*\/\s*/g, ', ') } } : {}),
          ...(ex.photos?.[0] ? { 'image': this.seo.absolute(ex.photos[0].imageurl) } : {}),
          'performer': { '@id': ARTIST_ID }
        }
      }))
    });
  }
}
