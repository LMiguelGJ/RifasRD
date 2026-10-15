import { Observable } from 'rxjs';

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

export interface RaffleQuery {
  perPage?: number;
  categoryId?: number;
}

/**
 * The only door between the UI and data.
 *
 * `MockRifasApi` implements it in memory for the static demo and
 * `HttpRifasApi` implements it against the real backend. Components inject
 * this class and never know which one they got.
 */
export abstract class RifasApi {
  abstract getCategories(): Observable<Category[]>;
  abstract getRaffles(query?: RaffleQuery): Observable<Paginated<Raffle>>;
  abstract getRaffle(id: number): Observable<Raffle>;
  abstract getPrizeNumbers(raffleId: number): Observable<PrizeNumber[]>;
  abstract getRecentWinners(limit?: number, options?: { kind?: 'main' }): Observable<Winner[]>;
  abstract getBankAccounts(): Observable<BankAccount[]>;
  abstract getCaptcha(): Observable<Captcha>;
  abstract getOrderBlock(): Observable<OrderBlockStatus>;
  abstract createParticipant(request: ParticipantRequest): Observable<Participant>;
  abstract createOrder(raffleId: number, request: CreateOrderRequest, voucher: File): Observable<CreatedOrder>;
  abstract lookupOrders(raffleId: number, body: LookupBody): Observable<LookupResult>;
  abstract getPublicOrder(token: string, customerSlug?: string): Observable<PublicOrder>;
}
