import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/landing/landing.component').then(m => m.LandingComponent),
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/auth/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./pages/auth/register/register.component').then(m => m.RegisterComponent),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent),
  },
  {
    path: 'dashboard/hunt/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/dashboard/hunt-detail/hunt-detail.component').then(m => m.HuntDetailComponent),
  },
  {
    path: 'dashboard/hunt/:id/edit',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/admin/admin.component').then(m => m.AdminComponent),
  },
  {
    path: 'play/:code',
    loadComponent: () =>
      import('./pages/play/play.component').then(m => m.PlayComponent),
  },
  { path: 'admin', redirectTo: 'dashboard' },
  { path: '**', redirectTo: '' },
];
