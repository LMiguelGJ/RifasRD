import { Provider } from '@angular/core';

import { environment } from '@env/environment';
import { HttpRifasApi } from './http-rifas-api';
import { MockRifasApi } from './mock-rifas-api';
import { RifasApi } from './rifas-api';

/** Picks the data source from `environment.useMock`. This is the single switch. */
export const API_PROVIDERS: Provider[] = [
  { provide: RifasApi, useExisting: environment.useMock ? MockRifasApi : HttpRifasApi },
];
