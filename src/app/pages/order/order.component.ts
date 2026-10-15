import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';

import { RifasApi } from '../../core/api/rifas-api';
import { PublicOrder } from '../../core/models/models';
import { apiErrorMessage } from '../../core/utils/api-error';
import { formatWhen } from '../../core/utils/format';
import { MoneyFormatPipe } from '../../shared/pipes/money-format.pipe';

const STATUS_LABELS: Record<string, string> = {
  pending_validation: 'Pendiente de validación',
  confirmed: 'Confirmado',
  validated: 'Validada',
  paid: 'Pagada',
  sold: 'Adquirido',
  pending: 'Pendiente',
};

/** Customer's personal link: `/<customer_slug>/<token>` shows the order and its assigned numbers. */
@Component({
  selector: 'app-order',
  standalone: true,
  imports: [RouterLink, MoneyFormatPipe],
  templateUrl: './order.component.html',
  styleUrl: './order.component.css',
})
export class OrderComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(RifasApi);
  private paramSub?: Subscription;

  loading = true;
  loadError: string | null = null;
  order: PublicOrder | null = null;
  clientSlug = '';

  protected readonly formatWhen = formatWhen;

  ngOnInit(): void {
    this.paramSub = this.route.paramMap.subscribe(params => {
      this.clientSlug = (params.get('clientSlug') ?? '').trim();
      this.validateToken((params.get('token') ?? '').trim());
    });
  }

  ngOnDestroy(): void {
    this.paramSub?.unsubscribe();
  }

  /** "maria-perez" -> "Maria Perez" */
  get clientLabel(): string {
    return this.clientSlug
      ? this.clientSlug
          .split('-')
          .filter(Boolean)
          .map(part => part.charAt(0).toUpperCase() + part.slice(1))
          .join(' ')
      : '';
  }

  get raffleBannerUrl(): string | null {
    const raffle = this.order?.raffle;
    return raffle ? raffle.banner_image || raffle.image?.url || null : null;
  }

  get orderStatusLabel(): string {
    return this.statusLabel(this.order?.status ?? '');
  }

  get isOrderPendingValidation(): boolean {
    return (this.order?.status ?? '').toLowerCase() === 'pending_validation';
  }

  get displayTicketNumbers(): string[] {
    const order = this.order;
    if (!order) return [];
    return order.tickets?.length ? order.tickets.map(t => t.number) : (order.ticket_numbers ?? []);
  }

  private statusLabel(status: string): string {
    return STATUS_LABELS[(status || '').toLowerCase()] ?? status;
  }

  private validateToken(token: string): void {
    this.loading = true;
    this.loadError = null;
    this.order = null;
    if (!token) {
      this.loading = false;
      this.loadError = 'El enlace no incluye un código de validación.';
      return;
    }
    this.api.getPublicOrder(token, this.clientSlug || undefined).subscribe({
      next: order => {
        this.order = order;
        this.loading = false;
      },
      error: err => {
        this.loadError = apiErrorMessage(err);
        this.loading = false;
      },
    });
  }
}
