import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { RifasApi } from '../../core/api/rifas-api';

const DEFAULT_MESSAGE =
  'Estamos trabajando en mejoras para ti. La plataforma se encuentra en mantenimiento temporalmente. Volveremos muy pronto con una mejor experiencia.';

/** Shown while purchases are blocked (`GET /api/security/order-block`). */
@Component({
  selector: 'app-mantenimiento',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './mantenimiento.component.html',
  styleUrl: './mantenimiento.component.css',
})
export class MantenimientoComponent {
  private readonly api = inject(RifasApi);

  protected readonly defaultMessage = DEFAULT_MESSAGE;
  loading = true;
  blocked = true;
  message: string | null = null;

  constructor() {
    this.refresh();
  }

  refresh(): void {
    this.loading = true;
    this.api
      .getOrderBlock()
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: status => {
          this.blocked = !!status.blocked;
          this.message = status.message ?? null;
        },
        // If the status cannot be read, assume maintenance (safe default for purchases).
        error: () => {
          this.blocked = true;
          this.message = DEFAULT_MESSAGE;
        },
      });
  }
}
