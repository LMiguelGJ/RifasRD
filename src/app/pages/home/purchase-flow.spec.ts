import { CreatedOrder, TicketCombo } from '../../core/models/models';
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

  it('prefers the URL provided by the server', () => {
    expect(PurchaseFlow.resolvePublicViewUrl(order({ public_view_url: 'https://x.test/a/b' }))).toBe('https://x.test/a/b');
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
