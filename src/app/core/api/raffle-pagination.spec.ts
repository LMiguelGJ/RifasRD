import { of, throwError } from 'rxjs';

import { Raffle } from '../models/models';
import { getAllRaffles } from './raffle-pagination';
import { RifasApi } from './rifas-api';

const raffle = (id: number, category_id = 1): Raffle => ({ id, category_id, title: `R${id}` } as Raffle);

describe('getAllRaffles', () => {
  it('follows finite pages, preserves category filters and removes duplicate IDs', done => {
    const calls: { page?: number; categoryId?: number }[] = [];
    const api = {
      getRaffles: (query: { page?: number; categoryId?: number }) => {
        calls.push(query);
        return of(query.page === 1
          ? { current_page: 1, last_page: 2, data: [raffle(1), raffle(2)], per_page: 2, total: 3 }
          : { current_page: 2, last_page: 2, data: [raffle(2), raffle(3)], per_page: 2, total: 3 });
      },
    } as unknown as RifasApi;

    getAllRaffles(api, { perPage: 2, categoryId: 1 }).subscribe(result => {
      expect(result.map(r => r.id)).toEqual([1, 2, 3]);
      expect(calls.map(call => call.page)).toEqual([1, 2]);
      expect(calls.every(call => call.categoryId === 1)).toBeTrue();
      done();
    }, done.fail);
  });

  it('removes repeated IDs within one page', done => {
    const api = { getRaffles: () => of({ current_page: 1, last_page: 1,
      data: [raffle(7), raffle(7)], per_page: 50, total: 2 }) } as unknown as RifasApi;
    getAllRaffles(api).subscribe(result => {
      expect(result.map(r => r.id)).toEqual([7]);
      done();
    }, done.fail);
  });

  it('emits a page-two error without retrying or requesting further pages', done => {
    let calls = 0;
    const api = { getRaffles: (query: { page?: number }) => {
      calls += 1;
      return query.page === 1
        ? of({ current_page: 1, last_page: 5, data: [raffle(1)], per_page: 1, total: 5 })
        : throwError(() => new Error('page failed'));
    } } as unknown as RifasApi;
    getAllRaffles(api).subscribe({
      error: error => {
        expect(error.message).toBe('page failed');
        expect(calls).toBe(2);
        done();
      },
    });
  });

  it('keeps request state isolated between cold subscriptions', done => {
    const calls: number[] = [];
    const api = { getRaffles: (query: { page?: number }) => {
      calls.push(query.page ?? 0);
      return of(query.page === 1
        ? { current_page: 1, last_page: 2, data: [raffle(1)], per_page: 1, total: 2 }
        : { current_page: 2, last_page: 2, data: [raffle(2)], per_page: 1, total: 2 });
    } } as unknown as RifasApi;
    const result$ = getAllRaffles(api);
    let complete = 0;
    result$.subscribe(() => complete++, done.fail);
    result$.subscribe(result => {
      expect(result.map(row => row.id)).toEqual([1, 2]);
      expect(calls).toEqual([1, 2, 1, 2]);
      expect(complete).toBe(1);
      done();
    }, done.fail);
  });

  it('stops on the final page and emits one page when pagination metadata is invalid', done => {
    let calls = 0;
    const api = { getRaffles: () => {
      calls += 1;
      return of({ current_page: 1, last_page: Number.POSITIVE_INFINITY, data: [raffle(1)], per_page: 50, total: 1 });
    } } as unknown as RifasApi;
    getAllRaffles(api).subscribe(result => {
      expect(result.map(r => r.id)).toEqual([1]);
      expect(calls).toBe(1);
      done();
    }, done.fail);
  });
});
