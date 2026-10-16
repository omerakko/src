import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ExhibitionService } from '../../../services/exhibition.service';
import { ARTIST_ID, SeoService } from '../../../services/seo.service';
import { Exhibition, ExhibitionPhoto } from '../../../models/exhibition.model';
import { imageSrcset, imageUrl } from '../../../models/image-url';
import { ImageModalComponent } from '../../../components/image-modal/image-modal.component';
import { I18nService } from '../../../i18n/i18n.service';
import { StringKey } from '../../../i18n/strings';

@Component({
  selector: 'app-exhibition-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, ImageModalComponent],
  templateUrl: './exhibition-detail.component.html',
  styleUrl: './exhibition-detail.component.css'
})
export class ExhibitionDetailComponent implements OnInit {
  private route             = inject(ActivatedRoute);
  private exhibitionService = inject(ExhibitionService);
  private seo               = inject(SeoService);
  readonly i18n             = inject(I18nService);

  exhibition: Exhibition | null = null;
  notFound = false;

  modalImage   = '';
  modalCaption = '';
  modalVisible = false;

  readonly imageUrl    = imageUrl;
  readonly imageSrcset = imageSrcset;

  t(key: StringKey) { return this.i18n.t(key); }

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.exhibitionService.getById(id).subscribe({
      next: ex => {
        this.exhibition = ex;
        this.applySeo(ex);
      },
      error: err => {
        this.notFound = true;
        // A 404 is a real "no such exhibition"; anything else is the API
        // failing, which must not be cached or indexed as "not found".
        if (err?.status !== 404) this.seo.markRenderError();
        this.seo.setPage({
          title: `${this.t('ex.notFound')} | Nilüfer Örel`,
          description: this.t('ex.notFound'),
          path: '/exhibitions'
        });
      }
    });
  }

  private applySeo(ex: Exhibition) {
    const year     = ex.date ? new Date(ex.date).getUTCFullYear() : undefined;
    const where    = ex.location ? ex.location.replace(/\s*\/\s*/g, ', ') : 'Türkiye';
    const cover    = ex.photos?.[0]?.imageurl;
    const path     = `/exhibitions/${ex.id}`;
    const summary  = (ex.description || '').replace(/\s+/g, ' ').trim();
    const description = summary
      ? `${ex.title}${year ? ` (${year})` : ''}, ${where} — ${this.t('ex.withPaintings')}. ${summary}`.slice(0, 300)
      : `${ex.title}${year ? ` (${year})` : ''}, ${where}. ${this.t('ex.detailDesc')}`;

    this.seo.setPage({
      title: `${ex.title}${year ? ` (${year})` : ''} – Nilüfer Örel | ${this.t('ex.title')}, ${where}`,
      description,
      path,
      image: cover,
      type: 'article'
    });
    this.seo.setBreadcrumbs([
      { name: this.t('nav.exhibitions'), path: '/exhibitions' },
      { name: ex.title, path }
    ]);
    this.seo.setJsonLd('schema-exhibition', {
      '@context': 'https://schema.org',
      '@type': 'ExhibitionEvent',
      'name': ex.title,
      'url': this.seo.canonicalUrl(this.i18n.link(path)),
      ...(ex.date ? { 'startDate': ex.date.slice(0, 10) } : {}),
      'location': { '@type': 'Place', 'name': where },
      ...(summary ? { 'description': summary } : {}),
      ...(cover ? { 'image': (ex.photos || []).map(p => this.seo.absolute(p.imageurl)) } : {}),
      'performer': { '@id': ARTIST_ID },
      'organizer': { '@id': ARTIST_ID },
      'eventStatus': 'https://schema.org/EventScheduled',
      'eventAttendanceMode': 'https://schema.org/OfflineEventAttendanceMode'
    });
  }

  openPhoto(photo: ExhibitionPhoto) {
    this.modalImage   = photo.imageurl;
    this.modalCaption = photo.title ?? '';
    this.modalVisible = true;
  }

  closeModal() { this.modalVisible = false; }
}
