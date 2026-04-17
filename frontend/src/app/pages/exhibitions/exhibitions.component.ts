import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
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

  exhibitions: Exhibition[] = [];
  sortBy = 'date';
  sortOrder = 'desc';

  modalImage = '';
  modalCaption = '';
  modalVisible = false;

  ngOnInit() {
    this.loadExhibitions();
  }

  loadExhibitions() {
    this.exhibitionService.getAll(this.sortBy, this.sortOrder).subscribe(res => {
      this.exhibitions = res.exhibitions;
    });
  }

  onSortChange(value: string) {
    const [sortBy, sortOrder] = value.split('-');
    this.sortBy = sortBy;
    this.sortOrder = sortOrder;
    this.loadExhibitions();
  }

  openPhoto(photo: ExhibitionPhoto) {
    this.modalImage = photo.imageurl;
    this.modalCaption = photo.title || '';
    this.modalVisible = true;
  }

  closeModal() { this.modalVisible = false; }
}
