/**
 * Data contracts shared by the UI, the mock API and the HTTP API.
 * They mirror the JSON served by the production backend, so a real server
 * only has to return these shapes (see docs/BACKEND-HANDOVER.md).
 */

export interface Category {
  id: number;
  name: string;
  slug: string;
  sort_order: number;
}

export type ComboAccent = 'blue' | 'gold';

export interface TicketCombo {
  id: number;
  raffle_id: number;
  quantity: number;
  /** Decimal as string, e.g. "150.00". */
  package_price: string;
  sort_order: number;
  show_on_public: boolean;
  accent: ComboAccent;
}

export interface RaffleImage {
  id: number;
  path: string;
  url: string;
  mime_type: string;
  size: number;
}

export interface Raffle {
  id: number;
  category_id: number;
  banner_image: string | null;
  title: string;
  description: string;
  ticket_goal: number;
  ticket_price: string;
  max_tickets_per_user: number;
  min_tickets_per_user: number;
  winners_count: number;
  digit_count: number;
  status: string;
  type: string;
  starts_at: string | null;
  ends_at: string | null;
  /** Null until 80% of the tickets are sold. */
  draw_at: string | null;
  show_available_tickets: boolean;
  show_ends_at: boolean;
  tickets_sold_count: number;
  tickets_available_count: number;
  category: { id: number; name: string; slug: string };
  image: RaffleImage | null;
  ticket_combos: TicketCombo[];
}

export interface Paginated<T> {
  current_page: number;
  data: T[];
  last_page: number;
  per_page: number;
  total: number;
}

export type PrizeNumberStatus = 'available' | 'claimed';

export interface PrizeNumber {
  id: number;
  number: string;
  prize_label: string | null;
  prize_amount: string;
  status: PrizeNumberStatus;
  sort_order: number;
}

export interface Winner {
  id: number;
  raffle_id?: number | null;
  display_name: string;
  /** Prize or raffle title shown under the name. */
  prize_label: string;
  drawn_at: string;
  display_raffle_title: string;
  display_ticket_number?: string | null;
  custom_raffle_title?: string | null;
  custom_ticket_number?: string | null;
  /** 'prize_number' = instant prize on a prize number; 'main' = main prize winner. */
  winner_type?: 'main' | 'prize_number' | string;
  raffle?: { id: number; title: string; type?: string } | null;
  ticket?: { id: number; number: string } | null;
  participant?: { id: number; name: string } | null;
  portrait_image: { id: number; url: string } | null;
}

export interface BankAccount {
  id: number;
  bank_name: string;
  account_type: string;
  account_number: string;
  account_holder_name: string;
  holder_id: string;
  currency: string;
  is_active: boolean;
  sort_order: number;
  color: string | null;
  image: { id: number; url: string } | null;
}

export interface Captcha {
  captcha_id: string;
  /** Inline SVG markup of the challenge. */
  captcha_svg: string;
}

export interface OrderBlockStatus {
  blocked: boolean;
  message: string | null;
}

/** Payload of the checkout form (the voucher file travels separately). */
export interface CreateOrderRequest {
  quantity?: number;
  ticket_combo_id?: number;
  customer_name: string;
  cedula?: string;
  /** E.164 digits without "+", e.g. 18095551234. */
  phone: string;
  email?: string;
  participant_id?: number;
  /** Sent only when the customer picked a bank account. */
  bank_account_id?: number;
  captcha_id?: string;
  captcha_answer?: string;
  turnstile_token?: string;
  /** Honeypot: must stay empty. */
  website?: string;
}

/** Order status values the UI knows how to label. */
export type OrderStatus =
  | 'pending_validation'
  | 'confirmed'
  | 'validated'
  | 'paid'
  | 'sold'
  | 'cancelled'
  | 'expired'
  | 'pending';

export interface OrderTicket {
  id?: number;
  number: string;
  status?: OrderStatus | string;
}

export interface CreatedOrder {
  id: number;
  status: OrderStatus | string;
  total_amount: string;
  customer_name?: string;
  phone?: string;
  tickets?: OrderTicket[];
  raffle_ticket_combo?: { quantity: number } | null;
  /** Pieces of the customer personal link: /<customer_slug>/<public_view_token>. */
  public_view_token?: string;
  customer_slug?: string;
  public_view_url?: string;
  public_view_api_url?: string;
}

export interface ParticipantRequest {
  name: string;
  cedula: string;
  phone: string;
  email: string | null;
}

export interface Participant {
  id: number;
}

export interface LookupBody {
  phone?: string;
  ticket_number?: string;
}

export interface LookupTicket {
  id?: number;
  number: string;
  status: OrderStatus | string;
}

export interface LookupOrder {
  id: number;
  customer_name?: string;
  email: string | null;
  phone: string | null;
  status: OrderStatus | string;
  created_at: string;
  total_amount?: string;
  tickets: LookupTicket[];
  public_view_token?: string;
  customer_slug?: string;
  public_view_url?: string;
  public_view_api_url?: string;
}

export interface LookupResult {
  raffle: { id: number; title: string; status: string };
  orders: LookupOrder[];
}

export interface PublicOrder {
  order_id: number;
  customer_name: string;
  status: OrderStatus | string;
  validated_at: string | null;
  total_amount: string;
  ticket_count: number;
  raffle: { id: number; title: string; banner_image: string | null; image?: { url: string } | null };
  tickets?: { number: string }[];
  ticket_numbers?: string[];
}
