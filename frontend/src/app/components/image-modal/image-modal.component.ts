import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { imageSrcset, imageUrl } from '../../models/image-url';

@Component({
  selector: 'app-image-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './image-modal.component.html',
  styleUrl: './image-modal.component.css'
})
export class ImageModalComponent {
  /** Original upload URL; the template picks the right resized variant. */
  @Input() imageUrl = '';
  @Input() caption = '';
  @Input() visible = false;
  @Output() close = new EventEmitter<void>();

  get src(): string        { return imageUrl(this.imageUrl, 1600); }
  get srcset(): string | null { return imageSrcset(this.imageUrl); }
}
