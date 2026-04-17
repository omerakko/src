import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Exhibition } from '../models/exhibition.model';

@Injectable({ providedIn: 'root' })
export class ExhibitionService {
  private http = inject(HttpClient);

  getAll(sortBy?: string, sortOrder?: string): Observable<{ exhibitions: Exhibition[] }> {
    let params = new HttpParams();
    if (sortBy) params = params.set('sortBy', sortBy);
    if (sortOrder) params = params.set('sortOrder', sortOrder);
    return this.http.get<{ exhibitions: Exhibition[] }>('/api/exhibitions', { params });
  }

  getAllAdmin(): Observable<{ exhibitions: Exhibition[] }> {
    return this.http.get<{ exhibitions: Exhibition[] }>('/api/admin/exhibitions');
  }

  create(data: Partial<Exhibition>): Observable<Exhibition> {
    return this.http.post<Exhibition>('/api/admin/exhibitions', data);
  }

  update(id: number, data: Partial<Exhibition>): Observable<Exhibition> {
    return this.http.put<Exhibition>(`/api/admin/exhibitions/${id}`, data);
  }

  delete(id: number): Observable<unknown> {
    return this.http.delete(`/api/admin/exhibitions/${id}`);
  }

  uploadPhotos(id: number, formData: FormData): Observable<unknown> {
    return this.http.post(`/api/admin/exhibitions/${id}/photos`, formData);
  }

  deletePhoto(exhibitionId: number, photoId: number): Observable<unknown> {
    return this.http.delete(`/api/admin/exhibitions/${exhibitionId}/photos/${photoId}`);
  }
}
