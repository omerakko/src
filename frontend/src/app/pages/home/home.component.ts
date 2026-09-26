import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PaintingService } from '../../services/painting.service';
import { SeoService } from '../../services/seo.service';
import { Painting } from '../../models/painting.model';
import { artworkAlt, artworkTitle } from '../../models/artwork';
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
  private seo             = inject(SeoService);

  featuredPaintings: Painting[] = [];
  modalImage   = '';
  modalCaption = '';
  modalVisible = false;

  readonly artworkAlt   = artworkAlt;
  readonly artworkTitle = artworkTitle;

  ngOnInit() {
    this.seo.setPage({
      title: 'Nilüfer Örel – Contemporary Painter, Bodrum, Türkiye | Ressam',
      description: 'Nilüfer Örel is a Turkish contemporary painter based in Bodrum, Muğla, working in mixed media, acrylic and oil. Original paintings, exhibitions and contact for galleries and collectors. Bodrum\'da yaşayan ressam Nilüfer Örel\'in özgün tabloları ve sergileri.',
      path: '/',
      type: 'profile'
    });

    this.paintingService.getFeatured().subscribe(res => {
      this.featuredPaintings = res.paintings;
    });
  }

  openModal(painting: Painting) {
    this.modalImage   = painting.imageurl;
    this.modalCaption = `${artworkTitle(painting)} — ${painting.year}`;
    this.modalVisible = true;
  }

  closeModal() { this.modalVisible = false; }
}
