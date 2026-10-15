import { Routes } from '@angular/router';

import { orderBlockGuard } from './core/guards/order-block.guard';
import { SiteShellComponent } from './shell/site-shell.component';

export const routes: Routes = [
  // Outside the shell on purpose: the maintenance page has no header or navigation.
  {
    path: 'mantenimiento',
    loadComponent: () =>
      import('./pages/mantenimiento/mantenimiento.component').then(m => m.MantenimientoComponent),
  },
  {
    path: '',
    component: SiteShellComponent,
    canMatch: [orderBlockGuard],
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
        path: ':clientSlug/:token',
        loadComponent: () => import('./pages/order/order.component').then(m => m.OrderComponent),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
