import { Routes } from '@angular/router';

import { authGuard, companyGuard, rootGuard } from '@/shared/core/auth';

export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login').then((m) => m.Login),
    title: 'Acessar conta',
  },
  {
    path: 'home',
    canActivate: [authGuard, companyGuard],
    loadComponent: () => import('./features/home/home').then((m) => m.Home),
    title: 'Home',
  },
  {
    path: 'movimentos/pendentes',
    canActivate: [authGuard, companyGuard],
    loadComponent: () => import('./features/movements/pending-review').then((m) => m.PendingReview),
    title: 'Revisão de movimentações',
  },
  {
    path: 'usuarios',
    canActivate: [authGuard, companyGuard],
    loadComponent: () => import('./features/users/users').then((m) => m.Users),
    title: 'Gerenciar usuários',
  },
  {
    path: 'unidades',
    canActivate: [authGuard, companyGuard],
    loadComponent: () =>
      import('./features/admin-unities/admin-unities').then((m) => m.AdminUnities),
    title: 'Gerenciar unidades',
  },
  {
    path: 'empresas',
    canActivate: [authGuard, rootGuard],
    loadComponent: () => import('./features/companies/companies').then((m) => m.Companies),
    title: 'Gerenciar empresas',
  },
  {
    path: 'pontos',
    canActivate: [authGuard, companyGuard],
    loadComponent: () => import('./features/points/points').then((m) => m.Points),
    title: 'Gerenciar pontos',
  },
  {
    path: 'veiculos',
    canActivate: [authGuard, companyGuard],
    loadComponent: () => import('./features/vehicles/vehicles').then((m) => m.Vehicles),
    title: 'Gerenciar veículos',
  },
  {
    path: 'cameras',
    canActivate: [authGuard, companyGuard],
    loadComponent: () => import('./features/cameras/cameras').then((m) => m.Cameras),
    title: 'Gerenciar câmeras',
  },
  {
    path: 'cameras/monitoramento',
    canActivate: [authGuard, companyGuard],
    loadComponent: () =>
      import('./features/cameras/cameras-monitoring').then((m) => m.CamerasMonitoring),
    title: 'Monitoramento de câmeras',
  },
  {
    path: 'minha-empresa',
    canActivate: [authGuard, companyGuard],
    loadComponent: () =>
      import('./features/company-profile/company-profile').then((m) => m.CompanyProfile),
    title: 'Minha empresa',
  },
  {
    path: 'anpr/uso-externo',
    canActivate: [authGuard, rootGuard],
    loadComponent: () => import('./features/anpr/external-usage').then((m) => m.ExternalUsage),
    title: 'Uso de APIs externas',
  },
  { path: '**', redirectTo: 'home' },
];
