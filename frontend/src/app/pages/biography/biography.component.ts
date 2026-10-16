import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SeoService } from '../../services/seo.service';
import { I18nService } from '../../i18n/i18n.service';
import { StringKey } from '../../i18n/strings';
import { BIO, CV, Country, STATEMENT, TECHNIQUES } from '../../i18n/content';

@Component({
  selector: 'app-biography',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './biography.component.html',
  styleUrl: './biography.component.css'
})
export class BiographyComponent implements OnInit {
  private seo   = inject(SeoService);
  readonly i18n = inject(I18nService);

  exhibitionsExpanded = false;
  techniquesExpanded  = false;

  readonly cv = CV;
  get bio()        { return BIO[this.i18n.lang()]; }
  get statement()  { return STATEMENT[this.i18n.lang()]; }
  get techniques() { return TECHNIQUES[this.i18n.lang()]; }

  t(key: StringKey) { return this.i18n.t(key); }
  country(c: Country) { return this.t(('country.' + c) as StringKey); }

  ngOnInit() {
    this.seo.setPage({
      title: this.t('about.seoTitle'),
      description: this.t('about.seoDesc'),
      path: '/about',
      image: '/assets/images/artistPhoto.jpg',
      type: 'profile'
    });
    this.seo.setBreadcrumbs([{ name: this.t('nav.about'), path: '/about' }]);
  }
}
