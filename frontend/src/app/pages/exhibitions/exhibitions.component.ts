import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe, DOCUMENT } from '@angular/common';
import { Title, Meta } from '@angular/platform-browser';
import { ExhibitionService } from '../../services/exhibition.service';
import { Exhibition, ExhibitionPhoto } from '../../models/exhibition.model';
import { ImageModalComponent } from '../../components/image-modal/image-modal.component';

@Component({
  selector: 'app-exhibitions',
  standalone: true,
  imports: [CommonModule, DatePipe, ImageModalComponent],
  templateUrl: './exhibitions.component.html',
  styleUrl: './exhibitions.component.css'
})
export class ExhibitionsComponent implements OnInit {
  private exhibitionService = inject(ExhibitionService);
  private titleService      = inject(Title);
  private meta              = inject(Meta);
  private document          = inject(DOCUMENT);

  exhibitions: Exhibition[] = [];
  sortBy    = 'date';
  sortOrder = 'desc';

  modalImage   = '';
  modalCaption = '';
  modalVisible = false;

  ngOnInit() {
    this.titleService.setTitle('Sergiler | Exhibitions – Nilüfer Örel, Bodrum');
    this.meta.updateTag({ name: 'description', content: 'Nilüfer Örel\'in Bodrum, İstanbul ve uluslararası sergileri. Bodrum Sanat Fuarı, Merqezart ve diğer sergiler. Exhibition history by Turkish painter.' });
    this.setCanonical('https://orelnilufer.com/exhibitions');
    this.loadExhibitions();
  }

  loadExhibitions() {
    this.exhibitionService.getAll(this.sortBy, this.sortOrder).subscribe(res => {
      this.exhibitions = res.exhibitions;
    });
  }

  onSortChange(value: string) {
    const [sortBy, sortOrder] = value.split('-');
    this.sortBy    = sortBy;
    this.sortOrder = sortOrder;
    this.loadExhibitions();
  }

  openPhoto(photo: ExhibitionPhoto) {
    this.modalImage   = photo.imageurl;
    this.modalCaption = photo.title || '';
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
