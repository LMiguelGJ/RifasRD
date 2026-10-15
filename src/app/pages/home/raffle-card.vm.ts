import { Raffle } from '../../core/models/models';
import { foldText, formatDrawDetail } from '../../core/utils/format';

export type BadgeVariant = 'tech' | 'efectivo' | 'velocidad' | 'premium';
export type TimelineKind = 'sorteo' | 'cierre';

/** View model of one catalog card, derived from the API `Raffle`. */
export interface RaffleCardVm {
  id: string;
  raffleType: 'premiados' | 'standard';
  title: string;
  description: string;
  image: string;
  badge: { text: string; variant: BadgeVariant };
  categoryId: number;
  detailLine: string;
  /** 0-100 percentage of tickets sold. */
  progress: number;
  unitPrice: number;
  minTickets: number;
  maxTicketsPerUser: number;
  soldOut: boolean;
  showAvailableTickets: boolean;
  ticketsAvailableCount: number;
  drawAtIso: string | null;
  timelineKind?: TimelineKind;
}

const CLOSED_STATUSES = new Set([
  'completed', 'closed', 'cancelled', 'canceled', 'finished', 'ended', 'drawn', 'sold_out', 'inactive',
]);

function badgeVariant(slug: string, name: string): BadgeVariant {
  const t = foldText(`${slug} ${name}`);
  if (t.includes('telef') || t.includes('phone') || t.includes('tech') || t.includes('ipad')) return 'tech';
  if (t.includes('efectiv') || t.includes('cash') || t.includes('dinero')) return 'efectivo';
  if (t.includes('moto') || t.includes('atv') || t.includes('can-am')) return 'velocidad';
  return 'premium';
}

function validIso(value: string | null | undefined): string | null {
  const v = (value ?? '').trim();
  if (!v) return null;
  return Number.isNaN(new Date(v).getTime()) ? null : v;
}

function timeline(r: Raffle): { iso: string | null; kind?: TimelineKind } {
  const draw = validIso(r.draw_at);
  if (draw) return { iso: draw, kind: 'sorteo' };
  if (r.show_ends_at !== false) {
    const end = validIso(r.ends_at);
    if (end) return { iso: end, kind: 'cierre' };
  }
  return { iso: null };
}

function isSoldOut(r: Raffle, available: number): boolean {
  const status = (r.status ?? '').toLowerCase().trim();
  const open = status === 'active' || status === 'open' || status === 'published';
  return CLOSED_STATUSES.has(status) || (status !== '' && !open) || available <= 0;
}

export function toRaffleCard(r: Raffle): RaffleCardVm {
  const goal = r.ticket_goal > 0 ? r.ticket_goal : 1;
  const available = Math.max(0, r.tickets_available_count ?? 0);
  const sold = Math.min(goal, Math.max(0, goal - available));
  const progress = Math.min(100, Math.round((sold / goal) * 100));
  const category = r.category?.name ?? 'Rifa';
  const { iso, kind } = timeline(r);
  return {
    id: String(r.id),
    raffleType: r.type === 'premiados' ? 'premiados' : 'standard',
    title: r.title,
    description: (r.description ?? '').trim(),
    image: r.banner_image || r.image?.url || '',
    badge: { text: category.toUpperCase().slice(0, 14), variant: badgeVariant(r.category?.slug ?? '', category) },
    categoryId: r.category_id,
    detailLine: formatDrawDetail(iso, kind),
    progress,
    unitPrice: Number.parseFloat(r.ticket_price) || 0,
    minTickets: Math.max(1, r.min_tickets_per_user),
    maxTicketsPerUser: Math.max(r.min_tickets_per_user, r.max_tickets_per_user),
    soldOut: isSoldOut(r, available),
    showAvailableTickets: !!r.show_available_tickets,
    ticketsAvailableCount: available,
    drawAtIso: iso,
    ...(iso ? { timelineKind: kind } : {}),
  };
}
