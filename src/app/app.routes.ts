import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/landing/landing.component').then(m => m.LandingComponent),
  },
  {
    path: 'admin',
    loadComponent: () =>
      import('./pages/admin/admin.component').then(m => m.AdminComponent),
  },
  {
    path: 'play/:code',
    loadComponent: () =>
      import('./pages/play/play.component').then(m => m.PlayComponent),
  },
  { path: '**', redirectTo: '' },
];
