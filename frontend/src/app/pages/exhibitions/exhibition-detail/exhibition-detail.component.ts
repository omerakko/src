import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ExhibitionService } from '../../../services/exhibition.service';
import { ARTIST_ID, SeoService } from '../../../services/seo.service';
import { Exhibition, ExhibitionPhoto } from '../../../models/exhibition.model';
import { imageSrcset, imageUrl } from '../../../models/image-url';
import { ImageModalComponent } from '../../../components/image-modal/image-modal.component';

@Component({
  selector: 'app-exhibition-detail',
  standalone: true,
  imports: [CommonModule, DatePipe, RouterLink, ImageModalComponent],
  templateUrl: './exhibition-detail.component.html',
  styleUrl: './exhibition-detail.component.css'
})
export class ExhibitionDetailComponent implements OnInit {
  private route             = inject(ActivatedRoute);
  private exhibitionService = inject(ExhibitionService);
  private seo               = inject(SeoService);

  exhibition: Exhibition | null = null;
  notFound = false;

  modalImage   = '';
  modalCaption = '';
  modalVisible = false;

  readonly imageUrl    = imageUrl;
  readonly imageSrcset = imageSrcset;

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
          title: 'Exhibition not found | Nilüfer Örel',
          description: 'This exhibition page does not exist.',
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
      ? `${ex.title}${year ? ` (${year})` : ''}, ${where} — exhibition with paintings by Nilüfer Örel. ${summary}`.slice(0, 300)
      : `${ex.title}${year ? ` (${year})` : ''} in ${where}: exhibition with paintings by Turkish contemporary artist Nilüfer Örel.`;

    this.seo.setPage({
      title: `${ex.title}${year ? ` (${year})` : ''} – Nilüfer Örel | Exhibition, ${where}`,
      description,
      path,
      image: cover,
      type: 'article'
    });
    this.seo.setBreadcrumbs([
      { name: 'Exhibitions', path: '/exhibitions' },
      { name: ex.title, path }
    ]);
    this.seo.setJsonLd('schema-exhibition', {
      '@context': 'https://schema.org',
      '@type': 'ExhibitionEvent',
      'name': ex.title,
      'url': this.seo.canonicalUrl(path),
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
