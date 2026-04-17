import { Component, HostListener, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PaintingService } from '../../services/painting.service';
import { Painting } from '../../models/painting.model';
import { ImageModalComponent } from '../../components/image-modal/image-modal.component';

@Component({
  selector: 'app-paintings',
  standalone: true,
  imports: [CommonModule, ImageModalComponent],
  templateUrl: './paintings.component.html',
  styleUrl: './paintings.component.css'
})
export class PaintingsComponent implements OnInit {
  private paintingService = inject(PaintingService);

  paintings: Painting[] = [];
  categories: string[] = ['All'];
  selectedCategory = 'All';

  currentPage = 1;
  readonly perPage = 6;
  hasNextPage = false;
  loading = false;

  modalImage = '';
  modalCaption = '';
  modalVisible = false;

  ngOnInit() {
    this.paintingService.getCategories().subscribe(cats => {
      this.categories = ['All', ...cats];
    });
    this.loadPaintings(true);
  }

  selectCategory(category: string) {
    if (this.selectedCategory === category) return;
    this.selectedCategory = category;
    this.currentPage = 1;
    this.paintings = [];
    this.loadPaintings(true);
  }

  loadPaintings(reset = false) {
    if (this.loading) return;
    this.loading = true;

    this.paintingService.getPaintings({
      page: this.currentPage,
      perPage: this.perPage,
      category: this.selectedCategory
    }).subscribe({
      next: res => {
        this.paintings = reset ? res.paintings : [...this.paintings, ...res.paintings];
        this.hasNextPage = res.hasNextPage;
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  @HostListener('window:scroll')
  onScroll() {
    if (this.loading || !this.hasNextPage) return;
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 300) {
      this.currentPage++;
      this.loadPaintings();
    }
  }

  openModal(painting: Painting) {
    this.modalImage = painting.imageurl;
    this.modalCaption = `${painting.title} — ${painting.medium}, ${painting.year}`;
    this.modalVisible = true;
  }

  closeModal() { this.modalVisible = false; }
}
