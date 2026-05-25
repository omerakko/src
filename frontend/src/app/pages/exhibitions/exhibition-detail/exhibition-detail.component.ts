import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe, DOCUMENT } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Title, Meta } from '@angular/platform-browser';
import { ExhibitionService } from '../../../services/exhibition.service';
import { Exhibition, ExhibitionPhoto } from '../../../models/exhibition.model';
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
  private titleService      = inject(Title);
  private meta              = inject(Meta);
  private document          = inject(DOCUMENT);

  exhibition: Exhibition | null = null;
  notFound = false;

  modalImage   = '';
  modalCaption = '';
  modalVisible = false;

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.exhibitionService.getById(id).subscribe({
      next: ex => {
        this.exhibition = ex;
        this.titleService.setTitle(`${ex.title} | Nilüfer Örel`);
        this.meta.updateTag({ name: 'description', content: ex.description ?? `${ex.title} – exhibition by Nilüfer Örel, ${ex.location ?? 'Bodrum'}.` });
        this.setCanonical(`https://orelnilufer.com/exhibitions/${id}`);
      },
      error: () => { this.notFound = true; }
    });
  }

  openPhoto(photo: ExhibitionPhoto) {
    this.modalImage   = photo.imageurl;
    this.modalCaption = photo.title ?? '';
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
}
