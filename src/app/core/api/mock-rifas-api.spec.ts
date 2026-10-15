import { HttpErrorResponse } from '@angular/common/http';
import { fakeAsync, tick } from '@angular/core/testing';
import { Observable } from 'rxjs';

import { CreateOrderRequest, CreatedOrder, LookupResult, PublicOrder } from '../models/models';
import { MOCK_VALIDATION_DELAY_MS, MockRifasApi } from './mock-rifas-api';

const STORAGE_KEY = 'rifas-demo-orders';
const HONDA = 20;

const voucher = (size = 10) => new File([new Uint8Array(size)], 'proof.png', { type: 'image/png' });

const request = (over: Partial<CreateOrderRequest> = {}): CreateOrderRequest => ({
  customer_name: 'María Pérez',
  phone: '18095551234',
  email: 'maria@example.com',
  bank_account_id: 3,
  ticket_combo_id: 179,
  website: '',
  ...over,
});

/** Runs an observable to completion inside fakeAsync and returns its value or error. */
function run<T>(obs: Observable<T>, ms = 1000): { value?: T; error?: unknown } {
  const out: { value?: T; error?: unknown } = {};
  obs.subscribe({ next: v => (out.value = v), error: e => (out.error = e) });
  tick(ms);
  return out;
}

describe('MockRifasApi', () => {
  let api: MockRifasApi;

  beforeEach(() => {
    localStorage.removeItem(STORAGE_KEY);
    api = new MockRifasApi();
  });

  afterEach(() => localStorage.removeItem(STORAGE_KEY));

  it('serves the catalog, categories, prize numbers, winners and banks', fakeAsync(() => {
    expect(run(api.getRaffles({ perPage: 50 })).value?.data.length).toBe(2);
    expect(run(api.getRaffles({ categoryId: 1 })).value?.data.map(r => r.id)).toEqual([HONDA]);
    expect(run(api.getCategories()).value?.length).toBe(3);
    expect(run(api.getPrizeNumbers(HONDA)).value?.length).toBeGreaterThan(0);
    expect(run(api.getPrizeNumbers(22)).value).toEqual([]);
    expect(run(api.getRecentWinners(5)).value?.length).toBe(5);
    expect(run(api.getBankAccounts()).value?.every(b => b.account_number.startsWith('0000'))).toBeTrue();
  }));

  it('registers an order as pending validation with a personal link', fakeAsync(() => {
    const created = run<CreatedOrder>(api.createOrder(HONDA, request(), voucher())).value!;
    expect(created.status).toBe('pending_validation');
    expect(created.customer_slug).toBe('maria-perez');
    expect(created.public_view_token?.length).toBeGreaterThan(10);
    expect(Number(created.total_amount)).toBe(150);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).length).toBe(1);
  }));

  it('rejects the honeypot, oversized receipts and out-of-range quantities', fakeAsync(() => {
    const status = (e: unknown) => (e as HttpErrorResponse).status;
    expect(status(run(api.createOrder(HONDA, request({ website: 'bot' }), voucher())).error)).toBe(422);
    expect(status(run(api.createOrder(HONDA, request(), voucher(11 * 1024 * 1024))).error)).toBe(422);
    const tooMany = request({ ticket_combo_id: undefined, quantity: 5000 });
    expect(status(run(api.createOrder(HONDA, tooMany, voucher())).error)).toBe(422);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]').length).toBe(0);
  }));

  it('requires the right captcha answer when a captcha is used', fakeAsync(() => {
    const captcha = run(api.getCaptcha()).value!;
    expect(captcha.captcha_svg).toContain('<svg');
    const wrong = request({ captcha_id: captcha.captcha_id, captcha_answer: 'ZZZZZ' });
    expect((run(api.createOrder(HONDA, wrong, voucher())).error as HttpErrorResponse).status).toBe(422);
  }));

  it('finds an order by the last 10 digits of the phone, only inside its raffle', fakeAsync(() => {
    run(api.createOrder(HONDA, request(), voucher()));
    const hit = run<LookupResult>(api.lookupOrders(HONDA, { phone: '8095551234' })).value!;
    expect(hit.orders.length).toBe(1);
    expect(hit.orders[0].status).toBe('pending_validation');
    expect(hit.orders[0].tickets).toEqual([]);
    expect(run<LookupResult>(api.lookupOrders(22, { phone: '8095551234' })).value!.orders.length).toBe(0);
    expect(run<LookupResult>(api.lookupOrders(HONDA, { phone: '8290000000' })).value!.orders.length).toBe(0);
  }));

  it('approves the order after the demo delay and assigns unique numbers', fakeAsync(() => {
    const created = run<CreatedOrder>(api.createOrder(HONDA, request({ ticket_combo_id: 180 }), voucher())).value!;
    const real = Date.now();
    spyOn(Date, 'now').and.returnValue(real + MOCK_VALIDATION_DELAY_MS + 1000);

    const order = run<PublicOrder>(api.getPublicOrder(created.public_view_token!, created.customer_slug)).value!;
    expect(order.status).toBe('validated');
    expect(order.ticket_numbers?.length).toBe(4);
    expect(new Set(order.ticket_numbers).size).toBe(4);
    expect(order.validated_at).not.toBeNull();

    const byTicket = run<LookupResult>(api.lookupOrders(HONDA, { ticket_number: order.ticket_numbers![0] })).value!;
    expect(byTicket.orders.length).toBe(1);
  }));

  it('answers 404 for unknown personal links', fakeAsync(() => {
    const error = run<PublicOrder>(api.getPublicOrder('nope', 'nobody')).error as HttpErrorResponse;
    expect(error.status).toBe(404);
  }));

  it('exposes the maintenance switch through localStorage', fakeAsync(() => {
    expect(run(api.getOrderBlock()).value?.blocked).toBeFalse();
    localStorage.setItem('rifas-demo-maintenance', '1');
    expect(run(api.getOrderBlock()).value?.blocked).toBeTrue();
    localStorage.removeItem('rifas-demo-maintenance');
  }));
});
