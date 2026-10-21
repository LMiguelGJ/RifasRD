import { Raffle } from '../../core/models/models';
import { toRaffleCard } from './raffle-card.vm';

const base = (over: Partial<Raffle> = {}): Raffle => ({
  id: 7,
  category_id: 2,
  banner_image: '/demo/raffles/a.webp',
  title: 'Demo raffle',
  description: 'Line one',
  ticket_goal: 1000,
  ticket_price: '25.00',
  max_tickets_per_user: 100,
  min_tickets_per_user: 4,
  winners_count: 0,
  digit_count: 5,
  status: 'active',
  type: 'standard',
  starts_at: null,
  ends_at: null,
  draw_at: null,
  show_available_tickets: false,
  show_ends_at: false,
  tickets_sold_count: 0,
  tickets_available_count: 1000,
  category: { id: 2, name: 'Telefono', slug: 'Teléfonos' },
  image: null,
  ticket_combos: [],
  ...over,
});

describe('toRaffleCard', () => {
  it('derives progress from sold tickets and rounds it', () => {
    expect(toRaffleCard(base({ tickets_available_count: 450 })).progress).toBe(55);
    expect(toRaffleCard(base({ tickets_available_count: 0 })).progress).toBe(100);
  });

  it('marks a raffle sold out when no tickets are left or it is not active', () => {
    expect(toRaffleCard(base({ tickets_available_count: 0 })).soldOut).toBeTrue();
    expect(toRaffleCard(base({ status: 'drawn' })).soldOut).toBeTrue();
    expect(toRaffleCard(base()).soldOut).toBeFalse();
  });

  it('picks the badge variant from the category', () => {
    expect(toRaffleCard(base()).badge.variant).toBe('tech');
    expect(toRaffleCard(base({ category: { id: 5, name: 'Dinero', slug: 'Dinero' } })).badge.variant).toBe('efectivo');
    expect(toRaffleCard(base({ category: { id: 1, name: 'Vehículos', slug: 'vehiculo' } })).badge.variant).toBe('premium');
    expect(toRaffleCard(base()).badge.text).toBe('TELEFONO');
  });

  it('uses the draw date when present and falls back to the closing date', () => {
    const drawn = toRaffleCard(base({ draw_at: '2026-10-20T02:00:00.000Z' }));
    expect(drawn.timelineKind).toBe('sorteo');
    expect(drawn.detailLine.startsWith('Sorteo: ')).toBeTrue();

    const closing = toRaffleCard(base({ ends_at: '2026-11-01T02:00:00.000Z', show_ends_at: true }));
    expect(closing.timelineKind).toBe('cierre');

    const pending = toRaffleCard(base());
    expect(pending.drawAtIso).toBeNull();
    expect(pending.timelineKind).toBeUndefined();
  });

  it('maps technology and watch categories to their own badge variants', () => {
    expect(toRaffleCard(base({ category: { id: 2, name: 'Tecnología', slug: 'tecnologia' } })).badge.variant).toBe('tech');
    expect(toRaffleCard(base({ category: { id: 3, name: 'Relojes', slug: 'relojes' } })).badge.variant).toBe('reloj');
  });

  it('keeps an untouched raffle open with an empty progress bar', () => {
    const vm = toRaffleCard(base());
    expect(vm.progress).toBe(0);
    expect(vm.soldOut).toBeFalse();
  });

  describe('urgency', () => {
    const now = Date.parse('2026-10-21T12:00:00.000Z');
    const inHours = (h: number) => new Date(now + h * 3_600_000).toISOString();

    it('is "today" when the draw is less than 24 hours away', () => {
      expect(toRaffleCard(base({ draw_at: inHours(5) }), now).urgency).toBe('today');
    });

    it('is "soon" when the draw is between 24 and 72 hours away', () => {
      expect(toRaffleCard(base({ draw_at: inHours(30) }), now).urgency).toBe('soon');
    });

    it('is null without a draw date, with a far one, with a past one or when sold out', () => {
      expect(toRaffleCard(base(), now).urgency).toBeNull();
      expect(toRaffleCard(base({ draw_at: inHours(200) }), now).urgency).toBeNull();
      expect(toRaffleCard(base({ draw_at: inHours(-3) }), now).urgency).toBeNull();
      expect(toRaffleCard(base({ draw_at: inHours(5), tickets_available_count: 0 }), now).urgency).toBeNull();
    });
  });

  it('never lets the maximum per user fall below the minimum', () => {
    const vm = toRaffleCard(base({ min_tickets_per_user: 5, max_tickets_per_user: 2 }));
    expect(vm.minTickets).toBe(5);
    expect(vm.maxTicketsPerUser).toBe(5);
  });
});
