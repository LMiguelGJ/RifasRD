import { CreatedOrder, Raffle, TicketCombo } from '../../core/models/models';
import { of, throwError } from 'rxjs';
import { PurchaseFlow, PurchaseHost } from './purchase-flow';
import { RaffleCardVm } from './raffle-card.vm';

const raffle: RaffleCardVm = {
  id: '20',
  raffleType: 'standard',
  title: 'Honda CRV',
  description: '',
  image: '',
  badge: { text: 'VEHÍCULOS', variant: 'premium' },
  categoryId: 1,
  detailLine: '',
  progress: 10,
  unitPrice: 75,
  minTickets: 2,
  maxTicketsPerUser: 1000,
  soldOut: false,
  showAvailableTickets: false,
  ticketsAvailableCount: 500,
  drawAtIso: null,
  urgency: null,
};

const combo = (id: number, quantity: number, price: string): TicketCombo => ({
  id,
  raffle_id: 20,
  quantity,
  package_price: price,
  sort_order: id,
  show_on_public: true,
  accent: 'blue',
});

function makeValidForConfirm(flow: PurchaseFlow): void {
  flow.nombreApellidos = 'Maria Perez';
  flow.phoneE164 = '+18095551234';
  flow.phoneIsValid = true;
  flow.bankAccounts = [{ id: 1 } as never];
  flow.selectedBankAccountId = 1;
  flow.receiptFile = new File(['proof'], 'proof.png', { type: 'image/png' });
  flow.turnstileToken = 'test-token';
  flow.acceptTerms = true;
}

function makeFlow(): PurchaseFlow {
  const host = {
    api: {},
    sanitizer: {},
    isDrawFinished: () => false,
    sheet: () => undefined,
    receiptInput: () => undefined,
    resetTurnstile: () => undefined,
    onVisibilityChange: () => undefined,
  } as unknown as PurchaseHost;
  return new PurchaseFlow(host);
}

describe('PurchaseFlow validators', () => {
  it('accepts names with letters, accents, spaces, apostrophes and hyphens only', () => {
    expect(PurchaseFlow.isValidFullName('María José')).toBeTrue();
    expect(PurchaseFlow.isValidFullName("O'Neil-Peña")).toBeTrue();
    expect(PurchaseFlow.isValidFullName('J')).toBeFalse();
    expect(PurchaseFlow.isValidFullName('Juan 123')).toBeFalse();
    expect(PurchaseFlow.isValidFullName('')).toBeFalse();
  });

  it('treats the email as optional but rejects invalid or "+" addresses', () => {
    expect(PurchaseFlow.isValidEmail('')).toBeTrue();
    expect(PurchaseFlow.isValidEmail('maria@example.com')).toBeTrue();
    expect(PurchaseFlow.isValidEmail('maria+tag@example.com')).toBeFalse();
    expect(PurchaseFlow.isValidEmail('maria@')).toBeFalse();
  });

  it('detects phone numbers made only of zeros', () => {
    expect(PurchaseFlow.isAllZeros('00000000000')).toBeTrue();
    expect(PurchaseFlow.isAllZeros('18095551234')).toBeFalse();
    expect(PurchaseFlow.isAllZeros('')).toBeFalse();
  });

  it('cleans and capitalizes typed names', () => {
    const flow = makeFlow();
    flow.onNombreApellidosChange('maria   perez123');
    expect(flow.nombreApellidos).toBe('Maria Perez');
  });
});

describe('PurchaseFlow fresh raffle detail', () => {
  const detail = (over: Partial<Raffle> = {}): Raffle => ({
    id: 20, category_id: 1, title: 'Fresh title', description: 'Fresh description', banner_image: '/fresh.png',
    ticket_goal: 100, ticket_price: '100', max_tickets_per_user: 10, min_tickets_per_user: 2,
    winners_count: 1, digit_count: 2, status: 'active', type: 'standard', starts_at: null, ends_at: null,
    draw_at: null, show_available_tickets: true, show_ends_at: false, tickets_sold_count: 25,
    tickets_available_count: 75, category: { id: 1, name: 'Vehículos', slug: 'vehiculos' }, image: null,
    ticket_combos: [], ...over,
  });

  it('refreshes active checkout pricing, limits, availability, date, and combo selection', () => {
    const fresh = detail({
      ticket_price: '100', tickets_available_count: 61, min_tickets_per_user: 3, max_tickets_per_user: 7,
      draw_at: '2027-05-10T12:00:00.000Z',
      ticket_combos: [{ id: 9, raffle_id: 20, quantity: 5, package_price: '450.00', sort_order: 1, show_on_public: true, accent: 'blue' }],
    });
    const api = { getBankAccounts: () => of([]), getRaffle: () => of(fresh) };
    const host = { api, sanitizer: {}, isDrawFinished: () => false, sheet: () => undefined, receiptInput: () => undefined,
      resetTurnstile: () => undefined, onVisibilityChange: () => undefined } as unknown as PurchaseHost;
    const flow = new PurchaseFlow(host);
    flow.openFor(raffle);
    expect(flow.activeRaffle?.unitPrice).toBe(100);
    expect(flow.activeRaffle?.ticketsAvailableCount).toBe(61);
    expect(flow.activeRaffle?.drawAtIso).toBe(fresh.draw_at);
    expect(flow.activeRaffle?.minTickets).toBe(3);
    expect(flow.activeRaffle?.maxTicketsPerUser).toBe(7);
    expect(flow.selectedComboId).toBe(9);
    expect(flow.selectedCombo?.quantity).toBe(5);
    expect(flow.totalPay).toBe(450);
  });

  it('does not leave a removed selected combo purchasable after refresh', () => {
    const api = { getBankAccounts: () => of([]), getRaffle: () => of(detail({ ticket_combos: [
      { id: 12, raffle_id: 20, quantity: 4, package_price: '350.00', sort_order: 1, show_on_public: true, accent: 'blue' },
    ] })) };
    const host = { api, sanitizer: {}, isDrawFinished: () => false, sheet: () => undefined, receiptInput: () => undefined,
      resetTurnstile: () => undefined, onVisibilityChange: () => undefined } as unknown as PurchaseHost;
    const flow = new PurchaseFlow(host);
    flow.selectedComboId = 1;
    flow.openFor(raffle);
    expect(flow.publicCombos.map(item => item.id)).toEqual([12]);
    expect(flow.selectedComboId).toBe(12);
    expect(flow.selectedCombo?.id).toBe(12);
  });

  it('blocks confirmation for paused/deleted detail or a failed detail fetch', () => {
    const closedStatuses = ['paused', 'deleted'];
    for (const status of closedStatuses) {
      const flow = new PurchaseFlow({
        api: { getBankAccounts: () => of([]), getRaffle: () => of(detail({ status })) } as never,
        sanitizer: {} as never, isDrawFinished: () => false, sheet: () => undefined, receiptInput: () => undefined,
        resetTurnstile: () => undefined, onVisibilityChange: () => undefined,
      });
      flow.openFor(raffle);
      makeValidForConfirm(flow);
      expect(flow.canConfirm).withContext(status).toBeFalse();
    }
    const failed = new PurchaseFlow({
      api: { getBankAccounts: () => of([]), getRaffle: () => throwError(() => new Error('offline')) } as never,
      sanitizer: {} as never, isDrawFinished: () => false, sheet: () => undefined, receiptInput: () => undefined,
      resetTurnstile: () => undefined, onVisibilityChange: () => undefined,
    });
    failed.openFor(raffle);
    makeValidForConfirm(failed);
    expect(failed.canConfirm).toBeFalse();
  });
});

describe('PurchaseFlow pricing and quantity', () => {
  let flow: PurchaseFlow;

  beforeEach(() => {
    flow = makeFlow();
    flow.activeRaffle = raffle;
    flow.ticketQty = 2;
    flow.publicCombos = [combo(1, 2, '150.00'), combo(2, 14, '1,050.00')];
    flow.selectedComboId = 1;
    flow.purchaseSelectionMode = 'combo';
  });

  it('charges the package price while a package is selected', () => {
    expect(flow.totalPay).toBe(150);
    flow.selectCombo(2);
    expect(flow.totalPay).toBe(1050);
    expect(flow.checkoutTicketQuantity).toBe(14);
  });

  it('switches to unit price times quantity in free mode', () => {
    flow.setMode('custom');
    flow.ticketQty = 5;
    expect(flow.totalPay).toBe(375);
  });

  it('keeps the quantity inside the raffle limits', () => {
    flow.setMode('custom');
    flow.ticketQty = 2;
    flow.decTickets();
    expect(flow.ticketQty).toBe(2);
    expect(flow.clampTicketQty(5000)).toBe(1000);
    expect(flow.isTicketQtyAllowed(1)).toBeFalse();
    expect(flow.isTicketQtyAllowed(2)).toBeTrue();
  });

  it('is free of charge when the raffle cannot be played', () => {
    flow.activeRaffle = { ...raffle, soldOut: true };
    expect(flow.totalPay).toBe(0);
  });

  it('cannot confirm an empty form', () => {
    expect(flow.canConfirm).toBeFalse();
  });
});

describe('PurchaseFlow personal link', () => {
  const order = (over: Partial<CreatedOrder>): CreatedOrder => ({
    id: 1,
    status: 'pending_validation',
    total_amount: '150.00',
    ...over,
  });

  it('prefers an absolute URL and resolves a root-relative server URL against this origin', () => {
    expect(PurchaseFlow.resolvePublicViewUrl(order({ public_view_url: 'https://x.test/a/b' }))).toBe('https://x.test/a/b');
    expect(PurchaseFlow.resolvePublicViewUrl(order({ public_view_url: '/maria/abc' }))).toBe(`${location.origin}/maria/abc`);
  });

  it('rejects unsafe server URLs and falls back to the token path', () => {
    expect(PurchaseFlow.resolvePublicViewUrl(order({ public_view_url: 'javascript:alert(1)', customer_slug: 'maria', public_view_token: 'abc' })))
      .toBe(`${location.origin}/maria/abc`);
    expect(PurchaseFlow.resolvePublicViewUrl(order({ public_view_url: 'data:text/html,x' }))).toBeNull();
  });

  it('builds /<slug>/<token> on this site otherwise', () => {
    const url = PurchaseFlow.resolvePublicViewUrl(order({ customer_slug: 'maria-perez', public_view_token: 'abc123' }));
    expect(url).toBe(`${location.origin}/maria-perez/abc123`);
  });

  it('derives the slug from the customer name when the server sends none', () => {
    const url = PurchaseFlow.resolvePublicViewUrl(order({ customer_name: 'María Pérez', public_view_token: 'tok' }));
    expect(url).toBe(`${location.origin}/maria-perez/tok`);
  });

  it('returns null when there is no token to link to', () => {
    expect(PurchaseFlow.resolvePublicViewUrl(order({}))).toBeNull();
    expect(PurchaseFlow.resolvePublicViewUrl(null)).toBeNull();
  });
});
