import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

/**
 * Public pages. They are mounted three times: English at the root (the URLs
 * Google already indexed) and Turkish / French under /tr and /fr.
 * I18nService reads the language from the URL prefix.
 */
const pages: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent)
  },
  {
    path: 'paintings',
    loadComponent: () => import('./pages/paintings/paintings.component').then(m => m.PaintingsComponent)
  },
  {
    path: 'paintings/:slug',
    loadComponent: () => import('./pages/painting-detail/painting-detail.component').then(m => m.PaintingDetailComponent)
  },
  {
    path: 'exhibitions',
    loadComponent: () => import('./pages/exhibitions/exhibitions.component').then(m => m.ExhibitionsComponent)
  },
  {
    path: 'exhibitions/:id',
    loadComponent: () => import('./pages/exhibitions/exhibition-detail/exhibition-detail.component').then(m => m.ExhibitionDetailComponent)
  },
  {
    path: 'about',
    loadComponent: () => import('./pages/biography/biography.component').then(m => m.BiographyComponent)
  },
];

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'admin',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/admin/admin.component').then(m => m.AdminComponent)
  },
  { path: 'tr', children: pages },
  { path: 'fr', children: pages },
  { path: '',   children: pages },
  { path: '**', redirectTo: '' }
];
