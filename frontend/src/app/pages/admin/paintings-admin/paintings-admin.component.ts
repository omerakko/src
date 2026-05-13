import { Component, OnInit, OnDestroy, ViewChild, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import Sortable, { SortableEvent } from 'sortablejs';
import imageCompression from 'browser-image-compression';
import { PaintingService } from '../../../services/painting.service';
import { Painting } from '../../../models/painting.model';

@Component({
  selector: 'app-paintings-admin',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './paintings-admin.component.html',
  styleUrl: './paintings-admin.component.css'
})
export class PaintingsAdminComponent implements OnInit, OnDestroy {
  private paintingService = inject(PaintingService);
  private fb             = inject(FormBuilder);

  paintings: Painting[] = [];
  readonly categories = ['Nature', 'Abstract', 'Portraits', 'Landscapes', 'Seascape', 'Mixed Media'];

  reorderMode = false;
  showForm = false;
  editingId: number | null = null;
  showConfirmDelete: number | null = null;

  loading = false;
  message = '';
  messageType: 'success' | 'error' = 'success';

  /* Reorder state */
  saveState: 'idle' | 'saving' | 'saved' = 'idle';
  showUndo = false;
  private snapshotOrder: Painting[] = [];
  private undoTimer: ReturnType<typeof setTimeout> | null = null;
  private sortable: Sortable | null = null;

  selectedImageFile: File | null = null;
  imagePreviewUrl = '';

  @ViewChild('reorderGrid') private reorderGridRef?: ElementRef<HTMLElement>;

  form: FormGroup = this.fb.group({
    title:       ['', Validators.required],
    medium:      [''],
    year:        [new Date().getFullYear(), [Validators.required, Validators.min(1900)]],
    price:       [null],
    description: [''],
    isavailable: [true],
    featured:    [false],
    categories:  [[]]
  });

  ngOnInit()    { this.loadPaintings(); }
  ngOnDestroy() { this.destroySortable(); if (this.undoTimer) clearTimeout(this.undoTimer); }

  loadPaintings() {
    this.paintingService.getAllAdmin().subscribe(res => { this.paintings = res.paintings; });
  }

  toggleReorderMode() {
    this.reorderMode = !this.reorderMode;
    if (this.reorderMode) {
      // Wait one tick for Angular to render the @if block before querying the DOM.
      setTimeout(() => this.initSortable(), 0);
    } else {
      this.destroySortable();
      this.saveState = 'idle';
      this.showUndo  = false;
    }
  }

  private initSortable() {
    const el = this.reorderGridRef?.nativeElement;
    if (!el) return;

    this.sortable = Sortable.create(el, {
      animation:            220,
      easing:               'cubic-bezier(0.2, 0.8, 0.2, 1)',
      ghostClass:           'sort-ghost',
      dragClass:            'sort-drag',
      handle:               '.grip-handle',
      forceFallback:        true,
      fallbackClass:        'sort-fallback',
      fallbackTolerance:    6,
      onChoose: (evt: SortableEvent) => {
        // Visual "about to drag" feedback during the long-press delay on touch.
        (evt.item as HTMLElement).classList.add('sort-choosing');
      },
      onUnchoose: (evt: SortableEvent) => {
        (evt.item as HTMLElement).classList.remove('sort-choosing');
      },
      onStart: (evt: SortableEvent) => {
        (evt.item as HTMLElement).classList.remove('sort-choosing');
        this.saveState = 'idle';
        this.showUndo  = false;
      },
      onEnd: (evt: SortableEvent) => {
        if (evt.oldIndex === evt.newIndex) return;
        this.snapshotOrder = [...this.paintings];
        // Sync the TS array with the order SortableJS already applied to the DOM.
        const moved = this.paintings.splice(evt.oldIndex!, 1)[0];
        this.paintings.splice(evt.newIndex!, 0, moved);
        this.saveOrder();
      }
    });
  }

  private destroySortable() {
    this.sortable?.destroy();
    this.sortable = null;
  }

  private saveOrder() {
    this.saveState = 'saving';
    this.paintingService.reorder(this.paintings.map(p => p.id)).subscribe({
      next:  () => { this.saveState = 'saved'; this.triggerUndoToast(); },
      error: () => { this.saveState = 'idle'; this.showMsg('Error saving order', 'error'); }
    });
  }

  private triggerUndoToast() {
    this.showUndo = true;
    if (this.undoTimer) clearTimeout(this.undoTimer);
    this.undoTimer = setTimeout(() => { this.showUndo = false; }, 5000);
  }

  undoReorder() {
    if (this.undoTimer) clearTimeout(this.undoTimer);
    this.paintings = [...this.snapshotOrder];
    this.paintingService.reorder(this.paintings.map(p => p.id)).subscribe();
    this.showUndo  = false;
    this.saveState = 'idle';
    // Re-init SortableJS so its internal DOM order matches the restored array.
    this.destroySortable();
    setTimeout(() => this.initSortable(), 0);
  }

  /* ── Form helpers ──────────────────────────────────────────── */

  openAddForm() {
    this.editingId = null;
    this.form.reset({ year: new Date().getFullYear(), isavailable: true, featured: false, categories: [] });
    this.selectedImageFile = null;
    this.imagePreviewUrl   = '';
    this.showForm = true;
  }

  openEditForm(painting: Painting) {
    this.editingId = painting.id;
    this.form.patchValue({
      title:       painting.title,
      medium:      painting.medium,
      year:        painting.year,
      price:       painting.price ?? null,
      description: painting.description ?? '',
      isavailable: painting.isavailable,
      featured:    painting.featured,
      categories:  [...(painting.categories ?? [])]
    });
    this.imagePreviewUrl   = painting.imageurl;
    this.selectedImageFile = null;
    this.showForm = true;
  }

  async onImageSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    try {
      const compressed = await imageCompression(file, {
        maxSizeMB: 0.8,
        maxWidthOrHeight: 1200,
        useWebWorker: true,
        fileType: 'image/webp',
      });
      this.selectedImageFile = new File([compressed], compressed.name, { type: compressed.type });
    } catch {
      this.selectedImageFile = file;
    }

    const reader = new FileReader();
    reader.onload = () => (this.imagePreviewUrl = reader.result as string);
    reader.readAsDataURL(this.selectedImageFile!);
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
            this.paintingService.uploadImage(this.editingId!, fd).subscribe({
              next:  () => this.onSaveSuccess(),
              error: () => this.onSaveSuccess()
            });
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
        next:  () => this.onSaveSuccess(),
        error: err => this.showMsg(err.error?.message || 'Error creating', 'error')
      });
    }
  }

  private onSaveSuccess() {
    this.loading   = false;
    this.showForm  = false;
    this.loadPaintings();
    this.showMsg(this.editingId ? 'Painting updated!' : 'Painting created!', 'success');
  }

  confirmDelete(id: number) { this.showConfirmDelete = id; }

  deletePainting() {
    if (!this.showConfirmDelete) return;
    this.paintingService.delete(this.showConfirmDelete).subscribe({
      next:  () => { this.showConfirmDelete = null; this.loadPaintings(); this.showMsg('Deleted', 'success'); },
      error: () => this.showMsg('Error deleting', 'error')
    });
  }

  toggleFeatured(painting: Painting) {
    const count = this.paintings.filter(p => p.featured).length;
    if (!painting.featured && count >= 3) { this.showMsg('Max 3 featured paintings', 'error'); return; }
    this.paintingService.update(painting.id, { featured: !painting.featured }).subscribe({
      next:  () => { painting.featured = !painting.featured; },
      error: () => this.showMsg('Error', 'error')
    });
  }

  showMsg(msg: string, type: 'success' | 'error') {
    this.message     = msg;
    this.messageType = type;
    this.loading     = false;
    setTimeout(() => (this.message = ''), 3000);
  }
}
