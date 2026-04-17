import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent)
  },
  {
    path: 'paintings',
    loadComponent: () => import('./pages/paintings/paintings.component').then(m => m.PaintingsComponent)
  },
  {
    path: 'exhibitions',
    loadComponent: () => import('./pages/exhibitions/exhibitions.component').then(m => m.ExhibitionsComponent)
  },
  {
    path: 'about',
    loadComponent: () => import('./pages/biography/biography.component').then(m => m.BiographyComponent)
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'admin',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/admin/admin.component').then(m => m.AdminComponent)
  },
  { path: '**', redirectTo: '' }
];
