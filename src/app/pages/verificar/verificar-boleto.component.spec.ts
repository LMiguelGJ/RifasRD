import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of } from 'rxjs';

import { MockRifasApi } from '../../core/api/mock-rifas-api';
import { RifasApi } from '../../core/api/rifas-api';
import { Paginated, Raffle } from '../../core/models/models';
import { VerificarBoletoComponent } from './verificar-boleto.component';

const raffleRow = (id: number): Raffle => ({
  id, category_id: 1, banner_image: null, title: `Raffle ${id}`, description: '', ticket_goal: 100,
  ticket_price: '10.00', max_tickets_per_user: 10, min_tickets_per_user: 1, winners_count: 0, digit_count: 2,
  status: 'active', type: 'standard', starts_at: null, ends_at: null, draw_at: null, show_available_tickets: false,
  show_ends_at: false, tickets_sold_count: 0, tickets_available_count: 100,
  category: { id: 1, name: 'Category', slug: 'category' }, image: null, ticket_combos: [],
});
const page = (current: number, data: Raffle[]): Paginated<Raffle> => ({
  current_page: current, data, last_page: 2, per_page: 50, total: 51,
});

describe('VerificarBoletoComponent pagination', () => {
  it('includes raffle 51 from page two', fakeAsync(() => {
    const calls: { page?: number; perPage?: number }[] = [];
    const api = new MockRifasApi();
    spyOn(api, 'getRaffles').and.callFake(query => {
      calls.push(query ?? {});
      const rows = Array.from({ length: 51 }, (_, i) => raffleRow(i + 1));
      return of(query?.page === 2 ? page(2, [rows[50]]) : page(1, rows.slice(0, 50)));
    });
    TestBed.configureTestingModule({ providers: [{ provide: RifasApi, useValue: api }] });
    const component = TestBed.runInInjectionContext(() => new VerificarBoletoComponent());

    component.ngOnInit();
    tick(0);
    expect(component.raffleOptions.some(option => option.id === '51')).toBeTrue();
    expect(calls.map(call => call.page)).toEqual([1, 2]);
    expect(calls.every(call => call.perPage === 50)).toBeTrue();
    TestBed.resetTestingModule();
  }));
});

describe('VerificarBoletoComponent lookup body', () => {
  const build = VerificarBoletoComponent.buildLookupBody;

  it('searches by phone for 10 digits, ignoring separators', () => {
    expect(build('809-555-1234')).toEqual({ phone: '8095551234' });
    expect(build('(809) 555 1234')).toEqual({ phone: '8095551234' });
  });

  it('drops the country code from 11 digit numbers that start with 1', () => {
    expect(build('18095551234')).toEqual({ phone: '8095551234' });
  });

  it('treats anything else as a ticket number without spaces', () => {
    expect(build('29041')).toEqual({ ticket_number: '29041' });
    expect(build('0001 234')).toEqual({ ticket_number: '0001234' });
  });

  it('returns null for empty input', () => {
    expect(build('   ')).toBeNull();
  });

  it('only accepts 10 digits, or 11 starting with 1, as a phone', () => {
    expect(VerificarBoletoComponent.normalizePhoneForLookup('809555123')).toBeNull();
    expect(VerificarBoletoComponent.normalizePhoneForLookup('28095551234')).toBeNull();
  });
});
