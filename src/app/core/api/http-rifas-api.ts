import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '@env/environment';
import {
  BankAccount,
  Captcha,
  Category,
  CreateOrderRequest,
  CreatedOrder,
  LookupBody,
  LookupResult,
  Participant,
  ParticipantRequest,
  OrderBlockStatus,
  Paginated,
  PrizeNumber,
  PublicOrder,
  Raffle,
  Winner,
} from '../models/models';
import { RaffleQuery, RifasApi } from './rifas-api';

const JSON_HEADERS = { Accept: 'application/json' };

/**
 * Real backend implementation. Endpoints and payloads match the production
 * API (see docs/BACKEND-HANDOVER.md for the full contract).
 */
@Injectable({ providedIn: 'root' })
export class HttpRifasApi extends RifasApi {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl.replace(/\/+$/, '') + '/api';

  getCategories(): Observable<Category[]> {
    return this.http.get<Category[]>(`${this.base}/categories`, { headers: JSON_HEADERS });
  }

  getRaffles(query: RaffleQuery = {}): Observable<Paginated<Raffle>> {
    let params = new HttpParams();
    if (query.perPage != null) params = params.set('per_page', query.perPage);
    if (query.categoryId != null) params = params.set('category_id', query.categoryId);
    return this.http.get<Paginated<Raffle>>(`${this.base}/raffles`, { params, headers: JSON_HEADERS });
  }

  getRaffle(id: number): Observable<Raffle> {
    return this.http.get<Raffle>(`${this.base}/raffles/${id}`, { headers: JSON_HEADERS });
  }

  getPrizeNumbers(raffleId: number): Observable<PrizeNumber[]> {
    return this.http.get<PrizeNumber[]>(`${this.base}/raffles/${raffleId}/prize-numbers`, { headers: JSON_HEADERS });
  }

  getRecentWinners(limit = 12, options: { kind?: 'main' } = {}): Observable<Winner[]> {
    let params = new HttpParams().set('limit', limit);
    if (options.kind) params = params.set('kind', options.kind);
    return this.http.get<Winner[]>(`${this.base}/winners/recent`, { params, headers: JSON_HEADERS });
  }

  getBankAccounts(): Observable<BankAccount[]> {
    return this.http.get<BankAccount[]>(`${this.base}/bank-accounts`, { headers: JSON_HEADERS });
  }

  getCaptcha(): Observable<Captcha> {
    return this.http.get<Captcha>(`${this.base}/captcha`, { headers: JSON_HEADERS });
  }

  getOrderBlock(): Observable<OrderBlockStatus> {
    return this.http.get<OrderBlockStatus>(`${this.base}/security/order-block`, { headers: JSON_HEADERS });
  }

  createParticipant(request: ParticipantRequest): Observable<Participant> {
    return this.http
      .post<{ participant: Participant }>(`${this.base}/participants`, request, { headers: JSON_HEADERS })
      .pipe(map(r => r.participant));
  }

  createOrder(raffleId: number, request: CreateOrderRequest, voucher: File): Observable<CreatedOrder> {
    const form = new FormData();
    const set = (key: string, value: string | number | undefined | null): void => {
      if (value != null && String(value) !== '') form.append(key, String(value));
    };
    set('quantity', request.quantity);
    set('ticket_combo_id', request.ticket_combo_id);
    form.append('customer_name', request.customer_name);
    form.append('cedula', request.cedula ?? '');
    form.append('phone', request.phone);
    set('email', request.email?.trim());
    set('participant_id', request.participant_id);
    set('bank_account_id', request.bank_account_id);
    set('captcha_id', request.captcha_id);
    set('captcha_answer', request.captcha_answer);
    set('turnstile_token', request.turnstile_token);
    form.append('website', request.website ?? '');
    form.append('voucher', voucher, voucher.name);
    return this.http
      .post<unknown>(`${this.base}/raffles/${raffleId}/checkout`, form, { headers: JSON_HEADERS })
      .pipe(map(unwrapOrder));
  }

  lookupOrders(raffleId: number, body: LookupBody): Observable<LookupResult> {
    return this.http.post<LookupResult>(`${this.base}/raffles/${raffleId}/checkout/lookup`, body, {
      headers: JSON_HEADERS,
    });
  }

  getPublicOrder(token: string, customerSlug?: string): Observable<PublicOrder> {
    const t = encodeURIComponent(token.trim());
    const slug = (customerSlug ?? '').trim();
    const url = slug
      ? `${this.base}/public/orders/${encodeURIComponent(slug)}/${t}`
      : `${this.base}/public/orders/${t}`;
    return this.http.get<PublicOrder>(url, { headers: JSON_HEADERS });
  }
}

type Rec = Record<string, unknown>;
const isRec = (v: unknown): v is Rec => v != null && typeof v === 'object' && !Array.isArray(v);

/** The backend may answer `{order}`, `{data}` or the order itself; accept all three. */
function unwrapOrder(raw: unknown): CreatedOrder {
  if (!isRec(raw)) return raw as CreatedOrder;
  const data = isRec(raw['data']) ? raw['data'] : null;
  if (data && (data['id'] != null || data['order_id'] != null)) return unwrapOrder(data);
  const order = isRec(raw['order']) ? raw['order'] : raw;
  const pick = (...keys: string[]): string | undefined => {
    for (const source of [raw, order]) {
      for (const key of keys) {
        const v = source[key];
        if ((typeof v === 'string' && v.trim()) || typeof v === 'number') return String(v).trim();
      }
    }
    return undefined;
  };
  return {
    ...(order as unknown as CreatedOrder),
    public_view_token: pick('public_view_token', 'publicViewToken', 'view_token') ?? '',
    customer_slug: pick('customer_slug', 'customerSlug') ?? '',
    public_view_url: pick('public_view_url', 'publicViewUrl'),
    public_view_api_url: pick('public_view_api_url', 'publicViewApiUrl'),
  };
}
