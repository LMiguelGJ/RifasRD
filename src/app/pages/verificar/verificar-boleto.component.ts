import { Component, ElementRef, HostListener, Input, OnInit, ViewChild, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { RifasApi } from '../../core/api/rifas-api';
import { getAllRaffles } from '../../core/api/raffle-pagination';
import { LookupBody, LookupResult } from '../../core/models/models';
import { apiErrorMessage } from '../../core/utils/api-error';
import { formatWhen } from '../../core/utils/format';
import { MaskSensitivePipe } from '../../shared/pipes/mask-sensitive.pipe';

interface RaffleOption {
  id: string;
  title: string;
}

const STATUS_LABELS: Record<string, string> = {
  pending_validation: 'Pendiente de validación',
  confirmed: 'Confirmado',
  validated: 'Validada',
  paid: 'Pagada',
  sold: 'Adquirido',
  sold_out: 'Adquirido',
  cancelled: 'Cancelada',
  expired: 'Expirada',
  active: 'Activa',
  pending: 'Pendiente',
};

/** Ticket checker. Used as a page (`/verificar`) and embedded in the home accordion. */
@Component({
  selector: 'app-verificar-boleto',
  standalone: true,
  imports: [FormsModule, MaskSensitivePipe],
  templateUrl: './verificar-boleto.component.html',
  styleUrl: './verificar-boleto.component.css',
})
export class VerificarBoletoComponent implements OnInit {
  private readonly api = inject(RifasApi);

  @Input() embedded = false;
  @ViewChild('raffleCombo') private raffleComboRef?: ElementRef<HTMLElement>;

  raffleOptions: RaffleOption[] = [];
  rafflesLoading = false;
  rafflesLoadError: string | null = null;
  selectedRaffleId = '';
  query = '';
  readonly raffleOpen = signal(false);

  searchLoading = false;
  lookupError: string | null = null;
  lookupResult: LookupResult | null = null;

  protected readonly formatWhen = formatWhen;

  get raffleTriggerLabel(): string {
    const placeholder = 'Selecciona una rifa…';
    if (!this.selectedRaffleId) return placeholder;
    return this.raffleOptions.find(o => o.id === this.selectedRaffleId)?.title ?? placeholder;
  }

  ngOnInit(): void {
    this.rafflesLoading = true;
    getAllRaffles(this.api, { perPage: 50 }).subscribe({
      next: raffles => {
        this.raffleOptions = raffles.map(r => ({ id: String(r.id), title: r.title }));
        this.rafflesLoading = false;
      },
      error: () => {
        this.rafflesLoadError = 'No se pudieron cargar las rifas.';
        this.rafflesLoading = false;
      },
    });
  }

  toggleRaffleMenu(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (this.rafflesLoading || this.raffleOptions.length === 0) return;
    this.raffleOpen.update(open => !open);
  }

  selectRaffleOption(option: RaffleOption): void {
    this.selectedRaffleId = option.id;
    this.raffleOpen.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const el = this.raffleComboRef?.nativeElement;
    if (!el || el.contains(event.target as Node)) return;
    this.raffleOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.raffleOpen.set(false);
  }

  /** Dominican phones (10 digits, optionally with a leading 1) search by phone; anything else is a ticket number. */
  static buildLookupBody(input: string): LookupBody | null {
    const text = input.trim();
    if (!text) return null;
    const digits = text.replace(/\D/g, '');
    const phone = VerificarBoletoComponent.normalizePhoneForLookup(digits);
    if (phone) return { phone };
    const ticket = text.replace(/\s/g, '');
    return ticket.length > 0 ? { ticket_number: ticket } : null;
  }

  static normalizePhoneForLookup(digits: string): string | null {
    if (digits.length === 10) return digits;
    return digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : null;
  }

  search(): void {
    this.lookupError = null;
    this.lookupResult = null;
    const query = this.query.trim();
    if (!query) {
      this.lookupError = 'Escribe tu teléfono o número de boleto.';
      return;
    }
    const raffleId = this.selectedRaffleId.trim();
    if (!raffleId) {
      this.lookupError = 'Selecciona la rifa en la que compraste.';
      return;
    }
    const body = VerificarBoletoComponent.buildLookupBody(query);
    if (!body) {
      this.lookupError = 'No se pudo interpretar la búsqueda.';
      return;
    }
    const id = Number(raffleId);
    if (!Number.isFinite(id) || id < 1) {
      this.lookupError = 'Rifa no válida.';
      return;
    }
    this.searchLoading = true;
    this.api.lookupOrders(id, body).subscribe({
      next: result => {
        this.lookupResult = result;
        this.searchLoading = false;
      },
      error: err => {
        this.lookupError = apiErrorMessage(err);
        this.searchLoading = false;
      },
    });
  }

  isPendingValidation(status: string | null | undefined): boolean {
    return (status ?? '').toLowerCase() === 'pending_validation';
  }

  hasPendingValidationInResults(): boolean {
    const result = this.lookupResult;
    if (!result) return false;
    return result.orders.some(o => this.isPendingValidation(o.status) || o.tickets.some(t => this.isPendingValidation(t.status)));
  }

  statusLabel(status: string | null | undefined): string {
    const key = (status || '').toLowerCase();
    return STATUS_LABELS[key] ?? (status || '');
  }
}
