import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CdkDragDrop, CdkDropList, CdkDrag, moveItemInArray } from '@angular/cdk/drag-drop';
import { PaintingService } from '../../../services/painting.service';
import { Painting } from '../../../models/painting.model';

@Component({
  selector: 'app-paintings-admin',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CdkDropList, CdkDrag],
  templateUrl: './paintings-admin.component.html',
  styleUrl: './paintings-admin.component.css'
})
export class PaintingsAdminComponent implements OnInit {
  private paintingService = inject(PaintingService);
  private fb = inject(FormBuilder);

  paintings: Painting[] = [];
  readonly categories = ['Nature', 'Abstract', 'Portraits', 'Landscapes', 'Seascape', 'Mixed Media'];

  reorderMode = false;
  showForm = false;
  editingId: number | null = null;
  showConfirmDelete: number | null = null;

  loading = false;
  message = '';
  messageType: 'success' | 'error' = 'success';

  selectedImageFile: File | null = null;
  imagePreviewUrl = '';

  form: FormGroup = this.fb.group({
    title: ['', Validators.required],
    medium: [''],
    year: [new Date().getFullYear(), [Validators.required, Validators.min(1900)]],
    price: [null],
    description: [''],
    isavailable: [true],
    featured: [false],
    categories: [[]]
  });

  ngOnInit() { this.loadPaintings(); }

  loadPaintings() {
    this.paintingService.getAllAdmin().subscribe(res => { this.paintings = res.paintings; });
  }

  openAddForm() {
    this.editingId = null;
    this.form.reset({ year: new Date().getFullYear(), isavailable: true, featured: false, categories: [] });
    this.selectedImageFile = null;
    this.imagePreviewUrl = '';
    this.showForm = true;
  }

  openEditForm(painting: Painting) {
    this.editingId = painting.id;
    this.form.patchValue({
      title: painting.title,
      medium: painting.medium,
      year: painting.year,
      price: painting.price ?? null,
      description: painting.description ?? '',
      isavailable: painting.isavailable,
      featured: painting.featured,
      categories: [...(painting.categories ?? [])]
    });
    this.imagePreviewUrl = painting.imageurl;
    this.selectedImageFile = null;
    this.showForm = true;
  }

  onImageSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.selectedImageFile = file;
    const reader = new FileReader();
    reader.onload = () => (this.imagePreviewUrl = reader.result as string);
    reader.readAsDataURL(file);
  }

  isCategorySelected(cat: string): boolean {
    return ((this.form.value.categories as string[]) ?? []).includes(cat);
  }

  toggleCategory(cat: string) {
    const current: string[] = this.form.value.categories ?? [];
    const idx = current.indexOf(cat);
    this.form.patchValue({
      categories: idx > -1 ? current.filter(c => c !== cat) : [...current, cat]
    });
  }

  onSubmit() {
    if (this.form.invalid) return;
    this.loading = true;
    const data = this.form.value;

    if (this.editingId !== null) {
      this.paintingService.update(this.editingId, data).subscribe({
        next: () => {
          if (this.selectedImageFile) {
            const fd = new FormData();
            fd.append('image', this.selectedImageFile!);
            this.paintingService.uploadImage(this.editingId!, fd).subscribe({ next: () => this.onSaveSuccess(), error: () => this.onSaveSuccess() });
          } else {
            this.onSaveSuccess();
          }
        },
        error: err => this.showMsg(err.error?.message || 'Error updating', 'error')
      });
    } else {
      const fd = new FormData();
      Object.entries(data).forEach(([k, v]) => {
        if (k === 'categories') fd.append(k, JSON.stringify(v));
        else if (v !== null && v !== undefined) fd.append(k, String(v));
      });
      if (this.selectedImageFile) fd.append('image', this.selectedImageFile);
      this.paintingService.create(fd).subscribe({
        next: () => this.onSaveSuccess(),
        error: err => this.showMsg(err.error?.message || 'Error creating', 'error')
      });
    }
  }

  private onSaveSuccess() {
    this.loading = false;
    this.showForm = false;
    this.loadPaintings();
    this.showMsg(this.editingId ? 'Painting updated!' : 'Painting created!', 'success');
  }

  confirmDelete(id: number) { this.showConfirmDelete = id; }

  deletePainting() {
    if (!this.showConfirmDelete) return;
    this.paintingService.delete(this.showConfirmDelete).subscribe({
      next: () => { this.showConfirmDelete = null; this.loadPaintings(); this.showMsg('Deleted', 'success'); },
      error: () => this.showMsg('Error deleting', 'error')
    });
  }

  onDrop(event: CdkDragDrop<Painting[]>) {
    moveItemInArray(this.paintings, event.previousIndex, event.currentIndex);
    this.paintingService.reorder(this.paintings.map(p => p.id)).subscribe({
      next: () => this.showMsg('Order saved', 'success'),
      error: () => this.showMsg('Error saving order', 'error')
    });
  }

  toggleFeatured(painting: Painting) {
    const count = this.paintings.filter(p => p.featured).length;
    if (!painting.featured && count >= 3) { this.showMsg('Max 3 featured paintings', 'error'); return; }
    this.paintingService.update(painting.id, { featured: !painting.featured }).subscribe({
      next: () => { painting.featured = !painting.featured; },
      error: () => this.showMsg('Error', 'error')
    });
  }

  showMsg(msg: string, type: 'success' | 'error') {
    this.message = msg;
    this.messageType = type;
    this.loading = false;
    setTimeout(() => (this.message = ''), 3000);
  }
}
