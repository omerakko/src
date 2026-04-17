import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
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

  featuredPaintings: Painting[] = [];
  modalImage = '';
  modalCaption = '';
  modalVisible = false;

  ngOnInit() {
    this.paintingService.getFeatured().subscribe(res => {
      this.featuredPaintings = res.paintings;
    });
  }

  openModal(painting: Painting) {
    this.modalImage = painting.imageurl;
    this.modalCaption = `${painting.title} — ${painting.year}`;
    this.modalVisible = true;
  }

  closeModal() {
    this.modalVisible = false;
  }
}
