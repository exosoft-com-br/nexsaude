import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
  {
    path: 'auth',
    children: [
      {
        path: 'login',
        loadComponent: () =>
          import('./features/auth/login/login.component').then(m => m.LoginComponent),
      },
      {
        path: 'register',
        loadComponent: () =>
          import('./features/auth/register/register.component').then(m => m.RegisterComponent),
      },
    ],
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
  },
  {
    path: 'leads',
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/leads/lista-leads/lista-leads.component').then(m => m.ListaLeadsComponent),
      },
      {
        path: 'busca',
        loadComponent: () =>
          import('./features/leads/busca-maps/busca-maps.component').then(m => m.BuscaMapsComponent),
      },
      {
        path: ':id/enriquecimento',
        loadComponent: () =>
          import('./features/leads/enriquecimento/enriquecimento.component').then(m => m.EnriquecimentoComponent),
      },
    ],
  },
  {
    path: 'cotacao',
    canActivate: [authGuard],
    children: [
      {
        path: 'simulador',
        loadComponent: () =>
          import('./features/cotacao/simulador/simulador.component').then(m => m.SimuladorComponent),
      },
      {
        path: 'simulador/:leadId',
        loadComponent: () =>
          import('./features/cotacao/simulador/simulador.component').then(m => m.SimuladorComponent),
      },
    ],
  },
  {
    path: 'planos',
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/planos/tabela-planos/tabela-planos.component').then(m => m.TabelaPlanosComponent),
      },
      {
        path: 'importar',
        loadComponent: () =>
          import('./features/planos/importar-plano/importar-plano.component').then(m => m.ImportarPlanoComponent),
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];
