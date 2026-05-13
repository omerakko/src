import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Title, Meta } from '@angular/platform-browser';
import { PaintingService } from '../../services/painting.service';
import { Painting } from '../../models/painting.model';
import { ImageModalComponent } from '../../components/image-modal/image-modal.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, ImageModalComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit {
  private paintingService = inject(PaintingService);
  private titleService   = inject(Title);
  private meta           = inject(Meta);
  private document       = inject(DOCUMENT);

  featuredPaintings: Painting[] = [];
  modalImage   = '';
  modalCaption = '';
  modalVisible = false;

  ngOnInit() {
    this.titleService.setTitle('Nilüfer Örel – Ressam | Bodrum, Milas');
    this.meta.updateTag({ name: 'description', content: 'Bodrum ve Milas\'ta yaşayan Türk ressam Nilüfer Örel\'in özgün tabloları ve sergileri. Turkish painter based in Bodrum, Muğla.' });
    this.setCanonical('https://orelnilufer.com/');

    this.paintingService.getFeatured().subscribe(res => {
      this.featuredPaintings = res.paintings;
    });
  }

  private setCanonical(url: string) {
    let link = this.document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!link) {
      link = this.document.createElement('link');
      link.rel = 'canonical';
      this.document.head.appendChild(link);
    }
    link.href = url;
  }

  openModal(painting: Painting) {
    this.modalImage   = painting.imageurl;
    this.modalCaption = `${painting.title} — ${painting.year}`;
    this.modalVisible = true;
  }

  closeModal() { this.modalVisible = false; }
}
