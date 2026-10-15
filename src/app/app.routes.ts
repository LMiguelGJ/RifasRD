import { Routes } from '@angular/router';
import { SiteShellComponent } from './shell/site-shell.component';

export const routes: Routes = [
  {
    path: '',
    component: SiteShellComponent,
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent),
      },
      {
        path: 'verificar',
        loadComponent: () =>
          import('./pages/verificar/verificar-boleto.component').then(m => m.VerificarBoletoComponent),
      },
      {
        path: 'mantenimiento',
        loadComponent: () =>
          import('./pages/mantenimiento/mantenimiento.component').then(m => m.MantenimientoComponent),
      },
      {
        path: ':clientSlug/:token',
        loadComponent: () => import('./pages/order/order.component').then(m => m.OrderComponent),
      },
      { path: '**', redirectTo: '' },
    ],
  },
];
