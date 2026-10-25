import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of } from 'rxjs';

import { RifasApi } from '../../core/api/rifas-api';
import { Category, Paginated, Raffle } from '../../core/models/models';
import { MockRifasApi } from '../../core/api/mock-rifas-api';
import { HomeComponent } from './home.component';

const raffle = (id: number): Raffle => ({
  id, category_id: 1, banner_image: null, title: `Raffle ${id}`, description: '', ticket_goal: 100,
  ticket_price: '10.00', max_tickets_per_user: 10, min_tickets_per_user: 1, winners_count: 0, digit_count: 2,
  status: 'active', type: 'standard', starts_at: null, ends_at: null, draw_at: null, show_available_tickets: false,
  show_ends_at: false, tickets_sold_count: 0, tickets_available_count: 100,
  category: { id: 1, name: 'Category', slug: 'category' }, image: null, ticket_combos: [],
});

const page = (current: number, data: Raffle[]): Paginated<Raffle> => ({
  current_page: current, data, last_page: 2, per_page: 50, total: 51,
});
const category: Category = { id: 1, name: 'Category', slug: 'category', sort_order: 1 };

describe('HomeComponent catalog pagination', () => {
  it('shows raffle 51 after page two and retains the selected category filter', fakeAsync(() => {
    const calls: { page?: number; categoryId?: number }[] = [];
    const api = new MockRifasApi();
    spyOn(api, 'getCategories').and.returnValue(of([category]));
    spyOn(api, 'getRaffles').and.callFake(query => {
      calls.push(query ?? {});
      const rows = Array.from({ length: 51 }, (_, i) => raffle(i + 1));
      return of(query?.page === 2 ? page(2, [rows[50]]) : page(1, rows.slice(0, 50)));
    });
    spyOn(api, 'getPrizeNumbers').and.returnValue(of([]));
    spyOn(api, 'getRecentWinners').and.returnValue(of([]));
    TestBed.configureTestingModule({ providers: [{ provide: RifasApi, useValue: api }] });
    const component = TestBed.runInInjectionContext(() => new HomeComponent());

    component.ngOnInit();
    tick(0);
    expect(component.raffles.some(card => card.id === '51')).toBeTrue();
    component.selectCatalogCategory(1);
    tick(0);
    expect(component.raffles.some(card => card.id === '51')).toBeTrue();
    expect(calls.slice(-2).map(call => call.page)).toEqual([1, 2]);
    expect(calls.slice(-2).every(call => call.categoryId === 1)).toBeTrue();
    tick(200);
    component.ngOnDestroy();
    TestBed.resetTestingModule();
  }));
});
