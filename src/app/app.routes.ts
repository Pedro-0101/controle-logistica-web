import { Routes } from '@angular/router';

import { authGuard } from '@/shared/core/auth';

export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login').then((m) => m.Login),
    title: 'Acessar conta',
  },
  {
    path: 'home',
    canActivate: [authGuard],
    loadComponent: () => import('./features/home/home').then((m) => m.Home),
    title: 'Home',
  },
  {
    path: 'usuarios',
    canActivate: [authGuard],
    loadComponent: () => import('./features/users/users').then((m) => m.Users),
    title: 'Gerenciar usuários',
  },
  {
    path: 'unidades',
    canActivate: [authGuard],
    loadComponent: () => import('./features/admin-unities/admin-unities').then((m) => m.AdminUnities),
    title: 'Gerenciar unidades',
  },
  {
    path: 'empresas',
    canActivate: [authGuard],
    loadComponent: () => import('./features/companies/companies').then((m) => m.Companies),
    title: 'Gerenciar empresas',
  },
  {
    path: 'pontos',
    canActivate: [authGuard],
    loadComponent: () => import('./features/points/points').then((m) => m.Points),
    title: 'Gerenciar pontos',
  },
  {
    path: 'veiculos',
    canActivate: [authGuard],
    loadComponent: () => import('./features/vehicles/vehicles').then((m) => m.Vehicles),
    title: 'Gerenciar veículos',
  },
  { path: '**', redirectTo: 'home' },
];
