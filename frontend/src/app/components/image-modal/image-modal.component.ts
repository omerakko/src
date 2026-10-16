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

  /**
   * The image box fills the screen and the painting is letterboxed inside it
   * (object-fit: contain). A tap on the painted area keeps the view open; a
   * tap on the empty band around it closes, like a tap anywhere else.
   */
  onImageClick(e: MouseEvent) {
    const img = e.target as HTMLImageElement;
    const box = img.getBoundingClientRect();
    if (img.naturalWidth && img.naturalHeight) {
      const scale = Math.min(box.width / img.naturalWidth, box.height / img.naturalHeight);
      const w = img.naturalWidth * scale, h = img.naturalHeight * scale;
      const left = box.left + (box.width - w) / 2, top = box.top + (box.height - h) / 2;
      const inside = e.clientX >= left && e.clientX <= left + w && e.clientY >= top && e.clientY <= top + h;
      if (inside) { e.stopPropagation(); return; }
    }
    // Outside the painting: let the click reach the backdrop, which closes.
  }

  get src(): string        { return imageUrl(this.imageUrl, 1600); }
  get srcset(): string | null { return imageSrcset(this.imageUrl); }
}
