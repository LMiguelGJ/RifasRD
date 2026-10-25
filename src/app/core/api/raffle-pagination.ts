import { EMPTY, Observable, defer, expand, reduce } from 'rxjs';

import { Paginated, Raffle } from '../models/models';
import { RaffleQuery, RifasApi } from './rifas-api';

/** Fetch every page reported by the API, retaining filters and deduplicating IDs. */
export function getAllRaffles(api: RifasApi, query: RaffleQuery = {}): Observable<Raffle[]> {
  return defer(() => {
    let requestedPage = 1;
    let pageLimit = 1;
    return api.getRaffles({ ...query, page: 1 }).pipe(
      expand((page: Paginated<Raffle>) => {
        if (requestedPage === 1) {
          pageLimit = Number.isSafeInteger(page.last_page) && page.last_page >= 1 ? page.last_page : 1;
        }
        if (requestedPage >= pageLimit) return EMPTY;
        requestedPage += 1;
        return api.getRaffles({ ...query, page: requestedPage });
      }),
      reduce((all, page) => {
        const seen = new Set(all.map(raffle => raffle.id));
        for (const raffle of page.data) {
          if (seen.has(raffle.id)) continue;
          seen.add(raffle.id);
          all.push(raffle);
        }
        return all;
      }, [] as Raffle[]),
    );
  });
}
