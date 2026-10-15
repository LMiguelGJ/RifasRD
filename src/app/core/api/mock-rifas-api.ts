import { Injectable } from '@angular/core';
import { Observable, defer, delay, of, throwError } from 'rxjs';

import {
  BankAccount,
  Captcha,
  Category,
  CreateOrderRequest,
  CreatedOrder,
  LookupBody,
  LookupOrder,
  LookupResult,
  OrderBlockStatus,
  OrderStatus,
  Paginated,
  Participant,
  ParticipantRequest,
  PrizeNumber,
  PublicOrder,
  Raffle,
  Winner,
} from '../models/models';
import { httpError } from '../utils/api-error';
import { RaffleQuery, RifasApi } from './rifas-api';
import { MOCK_BANK_ACCOUNTS, MOCK_CATEGORIES, MOCK_PRIZE_NUMBERS, MOCK_RAFFLES, MOCK_WINNERS } from './mock-data';

/** How long a demo order stays "pending validation" before the mock approves it. */
export const MOCK_VALIDATION_DELAY_MS = 20_000;

const STORAGE_KEY = 'rifas-demo-orders';
const MAX_VOUCHER_BYTES = 10 * 1024 * 1024;

interface StoredOrder {
  raffleId: number;
  orderId: number;
  customerName: string;
  customerSlug: string;
  token: string;
  phone: string;
  email: string | null;
  totalAmount: string;
  ticketCount: number;
  createdAt: string;
  /** Ticket numbers are assigned when the mock "validates" the payment. */
  ticketNumbers: string[];
  validatedAt: string | null;
}

/**
 * In-memory implementation of the API for the static demo.
 * Orders persist in localStorage, so a purchase can be found later in the
 * ticket checker and through its personal link.
 */
@Injectable({ providedIn: 'root' })
export class MockRifasApi extends RifasApi {
  private readonly captchaAnswers = new Map<string, string>();
  private participantSeq = 5000;

  getCategories(): Observable<Category[]> {
    return this.respond([...MOCK_CATEGORIES].sort((a, b) => b.sort_order - a.sort_order));
  }

  getRaffles(query: RaffleQuery = {}): Observable<Paginated<Raffle>> {
    let data = MOCK_RAFFLES.filter(r => r.status === 'active');
    if (query.categoryId != null) data = data.filter(r => r.category_id === query.categoryId);
    const perPage = query.perPage ?? 12;
    return this.respond({
      current_page: 1,
      data: data.slice(0, perPage),
      last_page: 1,
      per_page: perPage,
      total: data.length,
    });
  }

  getRaffle(id: number): Observable<Raffle> {
    return defer(() => {
      const raffle = MOCK_RAFFLES.find(r => r.id === id);
      return raffle ? of(raffle) : throwError(() => httpError(404, 'Rifa no encontrada.'));
    }).pipe(delay(250));
  }

  getPrizeNumbers(raffleId: number): Observable<PrizeNumber[]> {
    return this.respond(MOCK_PRIZE_NUMBERS[raffleId] ?? []);
  }

  getRecentWinners(limit = 12): Observable<Winner[]> {
    return this.respond(MOCK_WINNERS.slice(0, limit));
  }

  getBankAccounts(): Observable<BankAccount[]> {
    return this.respond(MOCK_BANK_ACCOUNTS.filter(b => b.is_active));
  }

  getCaptcha(): Observable<Captcha> {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const text = Array.from({ length: 5 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
    const id = crypto.randomUUID();
    this.captchaAnswers.set(id, text);
    return this.respond({ captcha_id: id, captcha_svg: this.renderCaptcha(text) });
  }

  /**
   * Demo switch: run `localStorage.setItem('rifas-demo-maintenance', '1')` in the browser console
   * (and `removeItem` to undo) to preview the maintenance page.
   */
  getOrderBlock(): Observable<OrderBlockStatus> {
    let blocked = false;
    try {
      blocked = localStorage.getItem('rifas-demo-maintenance') === '1';
    } catch {
      /* storage unavailable: treat as not blocked */
    }
    return this.respond({ blocked, message: null });
  }

  createParticipant(request: ParticipantRequest): Observable<Participant> {
    void request;
    return this.respond({ id: ++this.participantSeq });
  }

  createOrder(raffleId: number, request: CreateOrderRequest, voucher: File): Observable<CreatedOrder> {
    return defer(() => {
      const raffle = MOCK_RAFFLES.find(r => r.id === raffleId);
      if (!raffle) return throwError(() => httpError(404, 'Rifa no encontrada.'));
      if (request.website) return throwError(() => httpError(422, 'Solicitud rechazada.'));
      if (voucher.size > MAX_VOUCHER_BYTES) {
        return throwError(() => httpError(422, 'El comprobante no puede superar 10 MB.'));
      }
      if (request.captcha_id) {
        const expected = this.captchaAnswers.get(request.captcha_id);
        if (!expected || expected !== (request.captcha_answer ?? '').trim().toUpperCase()) {
          return throwError(
            () => httpError(422, 'El captcha es incorrecto. Inténtalo de nuevo.', { captcha_answer: ['invalid'] }),
          );
        }
        this.captchaAnswers.delete(request.captcha_id);
      }
      const { quantity, total } = this.price(raffle, request);
      if (quantity < raffle.min_tickets_per_user || quantity > raffle.max_tickets_per_user) {
        return throwError(
          () =>
            httpError(
              422,
              `La cantidad debe estar entre ${raffle.min_tickets_per_user} y ${raffle.max_tickets_per_user} boletos.`,
            ),
        );
      }
      const orders = this.load();
      const stored: StoredOrder = {
        raffleId,
        orderId: 1000 + orders.length + 1,
        customerName: request.customer_name.trim(),
        customerSlug: this.slugify(request.customer_name),
        token: this.randomToken(),
        phone: request.phone,
        email: request.email?.trim() || null,
        totalAmount: total.toFixed(2),
        ticketCount: quantity,
        createdAt: new Date().toISOString(),
        ticketNumbers: [],
        validatedAt: null,
      };
      orders.push(stored);
      this.save(orders);
      const created: CreatedOrder = {
        id: stored.orderId,
        status: 'pending_validation',
        total_amount: stored.totalAmount,
        customer_name: stored.customerName,
        phone: stored.phone,
        tickets: [],
        raffle_ticket_combo: request.ticket_combo_id ? { quantity } : null,
        public_view_token: stored.token,
        customer_slug: stored.customerSlug,
      };
      return of(created);
    }).pipe(delay(900));
  }

  lookupOrders(raffleId: number, body: LookupBody): Observable<LookupResult> {
    return defer(() => {
      const raffle = MOCK_RAFFLES.find(r => r.id === raffleId);
      if (!raffle) return throwError(() => httpError(404, 'Rifa no encontrada.'));
      const orders = this.load();
      let changed = false;
      for (const o of orders) changed = this.refreshValidation(o, orders) || changed;
      if (changed) this.save(orders);
      const matches = orders.filter(o => {
        if (o.raffleId !== raffleId) return false;
        if (body.phone) return o.phone.endsWith(body.phone.slice(-10));
        if (body.ticket_number) return o.ticketNumbers.includes(body.ticket_number);
        return false;
      });
      const result: LookupResult = {
        raffle: { id: raffle.id, title: raffle.title, status: raffle.status },
        orders: matches.map(o => this.toLookupOrder(o)),
      };
      return of(result);
    }).pipe(delay(600));
  }

  getPublicOrder(token: string, customerSlug?: string): Observable<PublicOrder> {
    return defer(() => {
      const orders = this.load();
      const found = orders.find(o => o.token === token && (!customerSlug || o.customerSlug === customerSlug));
      if (!found) {
        return throwError(() => httpError(404, 'No encontramos una orden con este enlace.'));
      }
      if (this.refreshValidation(found, orders)) this.save(orders);
      const raffle = MOCK_RAFFLES.find(r => r.id === found.raffleId)!;
      const order: PublicOrder = {
        order_id: found.orderId,
        customer_name: found.customerName,
        status: this.statusOf(found),
        validated_at: found.validatedAt,
        total_amount: found.totalAmount,
        ticket_count: found.ticketCount,
        raffle: { id: raffle.id, title: raffle.title, banner_image: raffle.banner_image, image: raffle.image },
        ticket_numbers: found.ticketNumbers,
      };
      return of(order);
    }).pipe(delay(500));
  }

  // ---- helpers ------------------------------------------------------------

  private respond<T>(value: T): Observable<T> {
    return of(value).pipe(delay(350));
  }

  private price(raffle: Raffle, request: CreateOrderRequest): { quantity: number; total: number } {
    const combo = raffle.ticket_combos.find(c => c.id === request.ticket_combo_id);
    if (combo) return { quantity: combo.quantity, total: Number(combo.package_price) };
    const quantity = request.quantity ?? 0;
    return { quantity, total: quantity * Number(raffle.ticket_price) };
  }

  private statusOf(o: StoredOrder): OrderStatus {
    return o.validatedAt ? 'validated' : 'pending_validation';
  }

  /**
   * Simulates the payment being approved by an operator after a short delay.
   * Returns true when the order changed and must be persisted.
   */
  private refreshValidation(o: StoredOrder, all: StoredOrder[]): boolean {
    if (o.validatedAt) return false;
    if (Date.now() - new Date(o.createdAt).getTime() < MOCK_VALIDATION_DELAY_MS) return false;
    const raffle = MOCK_RAFFLES.find(r => r.id === o.raffleId);
    const taken = new Set<string>([
      ...(MOCK_PRIZE_NUMBERS[o.raffleId] ?? []).map(p => p.number),
      ...all.flatMap(x => x.ticketNumbers),
    ]);
    const digits = raffle?.digit_count ?? 5;
    const numbers: string[] = [];
    while (numbers.length < o.ticketCount) {
      const n = String(Math.floor(Math.random() * 10 ** digits)).padStart(digits, '0');
      if (!taken.has(n)) {
        taken.add(n);
        numbers.push(n);
      }
    }
    o.ticketNumbers = numbers.sort();
    o.validatedAt = new Date().toISOString();
    return true;
  }

  private toLookupOrder(o: StoredOrder): LookupOrder {
    const status = this.statusOf(o);
    return {
      id: o.orderId,
      customer_name: o.customerName,
      email: o.email,
      phone: o.phone,
      status,
      created_at: o.createdAt,
      total_amount: o.totalAmount,
      tickets: o.ticketNumbers.map((number, i) => ({ id: o.orderId * 1000 + i, number, status })),
      public_view_token: o.token,
      customer_slug: o.customerSlug,
    };
  }

  private load(): StoredOrder[] {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as StoredOrder[];
    } catch {
      return [];
    }
  }

  private save(orders: StoredOrder[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
    } catch {
      /* storage unavailable: the demo keeps working for this session only */
    }
  }

  private slugify(name: string): string {
    return (
      name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 40) || 'cliente'
    );
  }

  private randomToken(): string {
    return Array.from(crypto.getRandomValues(new Uint8Array(12)), b => b.toString(16).padStart(2, '0')).join('');
  }

  private renderCaptcha(text: string): string {
    const chars = [...text]
      .map((c, i) => {
        const x = 18 + i * 26;
        const rot = Math.floor(Math.random() * 30) - 15;
        return `<text x="${x}" y="34" font-size="26" font-family="monospace" font-weight="700" fill="#facc3b" transform="rotate(${rot} ${x} 28)">${c}</text>`;
      })
      .join('');
    const noise = Array.from({ length: 5 }, () => {
      const r = () => Math.floor(Math.random() * 150);
      const y = () => Math.floor(Math.random() * 44);
      return `<path d="M${r()} ${y()} Q${r()} ${y()} ${r()} ${y()}" stroke="#6ea8fe" stroke-width="1.2" fill="none" opacity="0.6"/>`;
    }).join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 150 44" width="150" height="44" role="img" aria-label="Captcha"><rect width="150" height="44" rx="6" fill="#0b0c10"/>${noise}${chars}</svg>`;
  }
}
