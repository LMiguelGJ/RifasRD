import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '@env/environment';
import { CreatedOrder } from '../models/models';
import { HttpRifasApi } from './http-rifas-api';

const BASE = `${environment.apiUrl.replace(/\/+$/, '')}/api`;

describe('HttpRifasApi (backend contract)', () => {
  let api: HttpRifasApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(HttpRifasApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lists raffles with pagination and category filters', () => {
    api.getRaffles({ perPage: 50, categoryId: 1 }).subscribe();
    const req = http.expectOne(r => r.url === `${BASE}/raffles`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('per_page')).toBe('50');
    expect(req.request.params.get('category_id')).toBe('1');
    expect(req.request.headers.get('Accept')).toBe('application/json');
    req.flush({ current_page: 1, data: [], last_page: 1, per_page: 50, total: 0 });
  });

  it('adds page only when explicitly requested and leaves existing query URLs unchanged', () => {
    api.getRaffles({ perPage: 50, categoryId: 1, page: 2 }).subscribe();
    const paged = http.expectOne(r => r.url === `${BASE}/raffles`);
    expect(paged.request.params.get('page')).toBe('2');
    expect(paged.request.params.get('per_page')).toBe('50');
    expect(paged.request.params.get('category_id')).toBe('1');
    paged.flush({ current_page: 2, data: [], last_page: 2, per_page: 50, total: 51 });

    api.getRaffles({ perPage: 50, categoryId: 1 }).subscribe();
    const original = http.expectOne(r => r.url === `${BASE}/raffles`);
    expect(original.request.params.has('page')).toBeFalse();
    original.flush({ current_page: 1, data: [], last_page: 1, per_page: 50, total: 0 });
  });

  it('reads raffle detail, prize numbers, categories and banks from the documented paths', () => {
    api.getRaffle(20).subscribe();
    api.getPrizeNumbers(20).subscribe();
    api.getCategories().subscribe();
    api.getBankAccounts().subscribe();
    api.getOrderBlock().subscribe();
    api.getCaptcha().subscribe();
    for (const path of ['raffles/20', 'raffles/20/prize-numbers', 'categories', 'bank-accounts', 'security/order-block', 'captcha']) {
      http.expectOne(`${BASE}/${path}`).flush({});
    }
  });

  it('asks only for main winners when requested', () => {
    api.getRecentWinners(50, { kind: 'main' }).subscribe();
    const req = http.expectOne(r => r.url === `${BASE}/winners/recent`);
    expect(req.request.params.get('limit')).toBe('50');
    expect(req.request.params.get('kind')).toBe('main');
    req.flush([]);
  });

  it('creates the participant first and unwraps its id', () => {
    let id: number | undefined;
    api.createParticipant({ name: 'María', cedula: '', phone: '18095551234', email: null }).subscribe(p => (id = p.id));
    const req = http.expectOne(`${BASE}/participants`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ name: 'María', cedula: '', phone: '18095551234', email: null });
    req.flush({ participant: { id: 42 } });
    expect(id).toBe(42);
  });

  it('posts the checkout as multipart with the voucher, honeypot and no empty optional fields', () => {
    const file = new File(['x'], 'proof.png', { type: 'image/png' });
    let order: CreatedOrder | undefined;
    api
      .createOrder(
        20,
        {
          customer_name: 'María Pérez',
          cedula: '',
          phone: '18095551234',
          email: '  ',
          participant_id: 42,
          bank_account_id: 3,
          ticket_combo_id: 179,
          turnstile_token: 'tok',
          website: '',
        },
        file,
      )
      .subscribe(o => (order = o));

    const req = http.expectOne(`${BASE}/raffles/20/checkout`);
    expect(req.request.method).toBe('POST');
    const form = req.request.body as FormData;
    expect(form.get('ticket_combo_id')).toBe('179');
    expect(form.get('customer_name')).toBe('María Pérez');
    expect(form.get('phone')).toBe('18095551234');
    expect(form.get('participant_id')).toBe('42');
    expect(form.get('bank_account_id')).toBe('3');
    expect(form.get('turnstile_token')).toBe('tok');
    expect(form.get('website')).toBe('');
    expect(form.get('cedula')).toBe('');
    expect(form.has('email')).toBeFalse();
    expect(form.has('quantity')).toBeFalse();
    expect((form.get('voucher') as File).name).toBe('proof.png');

    req.flush({ order: { id: 1001, status: 'pending_validation', total_amount: '150.00' }, public_view_token: 'abc', customer_slug: 'maria-perez' });
    expect(order?.id).toBe(1001);
    expect(order?.public_view_token).toBe('abc');
    expect(order?.customer_slug).toBe('maria-perez');
  });

  it('accepts the order wrapped in { data } as well', () => {
    let order: CreatedOrder | undefined;
    api.createOrder(20, { customer_name: 'A', phone: '1', quantity: 2 }, new File(['x'], 'p.pdf')).subscribe(o => (order = o));
    http.expectOne(`${BASE}/raffles/20/checkout`).flush({ data: { id: 7, status: 'pending_validation', total_amount: '10.00', public_view_token: 'tk' } });
    expect(order?.id).toBe(7);
    expect(order?.public_view_token).toBe('tk');
  });

  it('looks orders up by phone or ticket number', () => {
    api.lookupOrders(20, { phone: '8095551234' }).subscribe();
    const req = http.expectOne(`${BASE}/raffles/20/checkout/lookup`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ phone: '8095551234' });
    req.flush({ raffle: { id: 20, title: 't', status: 'active' }, orders: [] });
  });

  it('reads the personal order with the slug in the path, encoded', () => {
    api.getPublicOrder(' tok/en ', 'maría perez').subscribe();
    http.expectOne(`${BASE}/public/orders/${encodeURIComponent('maría perez')}/${encodeURIComponent('tok/en')}`).flush({});
  });

  it('falls back to the token-only path when there is no slug', () => {
    api.getPublicOrder('tok').subscribe();
    http.expectOne(`${BASE}/public/orders/tok`).flush({});
  });
});
