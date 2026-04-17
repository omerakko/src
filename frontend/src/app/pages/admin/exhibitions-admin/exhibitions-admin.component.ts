import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ExhibitionService } from '../../../services/exhibition.service';
import { Exhibition } from '../../../models/exhibition.model';

@Component({
  selector: 'app-exhibitions-admin',
  standalone: true,
  imports: [CommonModule, DatePipe, ReactiveFormsModule],
  templateUrl: './exhibitions-admin.component.html',
  styleUrl: './exhibitions-admin.component.css'
})
export class ExhibitionsAdminComponent implements OnInit {
  private exhibitionService = inject(ExhibitionService);
  private fb = inject(FormBuilder);

  exhibitions: Exhibition[] = [];

  showForm = false;
  editingId: number | null = null;
  showConfirmDelete: number | null = null;

  loading = false;
  message = '';
  messageType: 'success' | 'error' = 'success';

  newPhotoFiles: File[] = [];

  form: FormGroup = this.fb.group({
    title: ['', Validators.required],
    description: [''],
    date: ['', Validators.required],
    location: ['']
  });

  ngOnInit() { this.loadExhibitions(); }

  loadExhibitions() {
    this.exhibitionService.getAllAdmin().subscribe(res => { this.exhibitions = res.exhibitions; });
  }

  get editingExhibition(): Exhibition | undefined {
    return this.editingId !== null ? this.exhibitions.find(e => e.id === this.editingId) : undefined;
  }

  openAddForm() {
    this.editingId = null;
    this.form.reset();
    this.newPhotoFiles = [];
    this.showForm = true;
  }

  openEditForm(exhibition: Exhibition) {
    this.editingId = exhibition.id;
    this.form.patchValue({
      title: exhibition.title,
      description: exhibition.description ?? '',
      date: exhibition.date?.split('T')[0] ?? '',
      location: exhibition.location ?? ''
    });
    this.newPhotoFiles = [];
    this.showForm = true;
  }

  onPhotosSelected(event: Event) {
    const files = (event.target as HTMLInputElement).files;
    if (files) this.newPhotoFiles = Array.from(files);
  }

  onSubmit() {
    if (this.form.invalid) return;
    this.loading = true;
    const data = this.form.value;

    if (this.editingId !== null) {
      this.exhibitionService.update(this.editingId, data).subscribe({
        next: () => this.uploadPhotosIfNeeded(this.editingId!),
        error: err => this.showMsg(err.error?.message || 'Error', 'error')
      });
    } else {
      this.exhibitionService.create(data).subscribe({
        next: (created) => this.uploadPhotosIfNeeded(created.id),
        error: err => this.showMsg(err.error?.message || 'Error', 'error')
      });
    }
  }

  private uploadPhotosIfNeeded(id: number) {
    if (!this.newPhotoFiles.length) { this.onSaveSuccess(); return; }
    const fd = new FormData();
    this.newPhotoFiles.forEach(f => fd.append('photos', f));
    this.exhibitionService.uploadPhotos(id, fd).subscribe({
      next: () => this.onSaveSuccess(),
      error: () => this.onSaveSuccess()
    });
  }

  private onSaveSuccess() {
    this.loading = false;
    this.showForm = false;
    this.loadExhibitions();
    this.showMsg(this.editingId ? 'Exhibition updated!' : 'Exhibition created!', 'success');
  }

  confirmDelete(id: number) { this.showConfirmDelete = id; }

  deleteExhibition() {
    if (!this.showConfirmDelete) return;
    this.exhibitionService.delete(this.showConfirmDelete).subscribe({
      next: () => { this.showConfirmDelete = null; this.loadExhibitions(); this.showMsg('Exhibition deleted', 'success'); },
      error: () => this.showMsg('Error deleting', 'error')
    });
  }

  deletePhoto(exhibitionId: number, photoId: number) {
    this.exhibitionService.deletePhoto(exhibitionId, photoId).subscribe({
      next: () => {
        const ex = this.exhibitions.find(e => e.id === exhibitionId);
        if (ex) ex.photos = ex.photos.filter(p => p.id !== photoId);
      }
    });
  }

  showMsg(msg: string, type: 'success' | 'error') {
    this.message = msg;
    this.messageType = type;
    this.loading = false;
    setTimeout(() => (this.message = ''), 3000);
  }
}
