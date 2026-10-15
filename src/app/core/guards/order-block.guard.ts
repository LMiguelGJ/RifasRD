import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';

import { RifasApi } from '../api/rifas-api';

/**
 * Sends visitors to `/mantenimiento` while purchases are blocked.
 * If the status cannot be read the site stays open, so an API hiccup never takes the storefront down.
 */
export const orderBlockGuard: CanMatchFn = () => {
  const api = inject(RifasApi);
  const router = inject(Router);
  return api.getOrderBlock().pipe(
    map(status => (status.blocked ? router.parseUrl('/mantenimiento') : true)),
    catchError(() => of(true)),
  );
};
