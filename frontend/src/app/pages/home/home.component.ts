import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PaintingService } from '../../services/painting.service';
import { SeoService } from '../../services/seo.service';
import { I18nService } from '../../i18n/i18n.service';
import { StringKey } from '../../i18n/strings';
import { Painting } from '../../models/painting.model';
import { artworkAlt, artworkPath, displayTitle } from '../../models/artwork';
import { imageSrcset, imageUrl } from '../../models/image-url';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit {
  private paintingService = inject(PaintingService);
  private seo             = inject(SeoService);
  readonly i18n           = inject(I18nService);

  featuredPaintings: Painting[] = [];

  readonly imageUrl    = imageUrl;
  readonly imageSrcset = imageSrcset;

  t(key: StringKey) { return this.i18n.t(key); }
  title(p: Painting) { return displayTitle(p, this.i18n.lang()); }
  alt(p: Painting)   { return artworkAlt(p, this.i18n.lang()); }
  link(p: Painting)  { return this.i18n.link(artworkPath(p)); }

  ngOnInit() {
    this.seo.setPage({
      title: this.t('home.seoTitle'),
      description: this.t('home.seoDesc'),
      path: '/',
      type: 'profile'
    });
    this.seo.removeJsonLd('schema-breadcrumb');

    this.paintingService.getFeatured().subscribe({
      next:  res => { this.featuredPaintings = res.paintings; },
      error: ()  => this.seo.markRenderError()
    });
  }
}
