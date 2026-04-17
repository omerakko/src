import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Painting, PaintingsResponse, FeaturedResponse } from '../models/painting.model';

@Injectable({ providedIn: 'root' })
export class PaintingService {
  private http = inject(HttpClient);

  getFeatured(): Observable<FeaturedResponse> {
    return this.http.get<FeaturedResponse>('/api/paintings/featured');
  }

  getPaintings(params: { page?: number; perPage?: number; category?: string } = {}): Observable<PaintingsResponse> {
    let p = new HttpParams();
    if (params.page) p = p.set('page', params.page);
    if (params.perPage) p = p.set('perPage', params.perPage);
    if (params.category && params.category !== 'All') p = p.set('category', params.category);
    return this.http.get<PaintingsResponse>('/api/paintings', { params: p });
  }

  getCategories(): Observable<string[]> {
    return this.http.get<string[]>('/api/paintings/categories');
  }

  getAllAdmin(): Observable<{ paintings: Painting[] }> {
    return this.http.get<{ paintings: Painting[] }>('/api/admin/paintings/all');
  }

  create(data: FormData): Observable<Painting> {
    return this.http.post<{ painting: Painting }>('/api/admin/paintings', data)
      .pipe(map((res: { painting: Painting }) => res.painting));
  }

  update(id: number, data: Partial<Painting>): Observable<Painting> {
    return this.http.put<{ painting: Painting }>(`/api/admin/paintings/${id}`, data)
      .pipe(map((res: { painting: Painting }) => res.painting));
  }

  uploadImage(id: number, formData: FormData): Observable<unknown> {
    return this.http.post(`/api/admin/paintings/${id}/image`, formData);
  }

  delete(id: number): Observable<unknown> {
    return this.http.delete(`/api/admin/paintings/${id}`);
  }

  reorder(ids: number[]): Observable<unknown> {
    return this.http.post('/api/admin/paintings/reorder', { ids });
  }
}
