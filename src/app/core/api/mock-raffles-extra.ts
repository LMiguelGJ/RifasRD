import { Raffle, TicketCombo } from '../models/models';
import { MOCK_CATEGORIES } from './mock-categories';

/**
 * Example raffles added for the Rev restyle demo. Titles, prices and sold
 * percentages are invented demo data. Demo photos in `public/demo/rev/` ship with
 * the app; see README for provenance and replacement requirements.
 */
interface DemoRaffleSpec {
  id: number;
  categoryId: number;
  title: string;
  image: string;
  goal: number;
  price: number;
  minTickets: number;
  maxTickets: number;
  /** Share of the goal already sold, 0-100. */
  soldPct: number;
  /** Hours until the draw. Only allowed once 80% is sold (business rule). */
  drawInHours?: number;
  /** Package sizes, in tickets. */
  packages: number[];
}

const HOUR_MS = 3_600_000;

function build(spec: DemoRaffleSpec): Raffle {
  const category = MOCK_CATEGORIES.find(c => c.id === spec.categoryId)!;
  const sold = Math.round((spec.goal * spec.soldPct) / 100);
  const combos: TicketCombo[] = spec.packages.map((quantity, i) => ({
    id: spec.id * 10 + i,
    raffle_id: spec.id,
    quantity,
    package_price: (quantity * spec.price).toFixed(2),
    sort_order: i + 1,
    show_on_public: true,
    accent: i === spec.packages.length - 1 ? 'gold' : 'blue',
  }));
  const url = `/demo/rev/${spec.image}.webp`;
  return {
    id: spec.id,
    category_id: category.id,
    banner_image: url,
    title: spec.title,
    description: `${spec.title}. Rifa de ejemplo para la demostración.`,
    ticket_goal: spec.goal,
    ticket_price: spec.price.toFixed(2),
    max_tickets_per_user: spec.maxTickets,
    min_tickets_per_user: spec.minTickets,
    winners_count: 0,
    digit_count: 5,
    status: 'active',
    type: 'standard',
    starts_at: new Date(Date.now() - 5 * 24 * HOUR_MS).toISOString(),
    ends_at: null,
    draw_at: spec.drawInHours == null ? null : new Date(Date.now() + spec.drawInHours * HOUR_MS).toISOString(),
    show_available_tickets: false,
    show_ends_at: false,
    tickets_sold_count: sold,
    tickets_available_count: spec.goal - sold,
    category: { id: category.id, name: category.name, slug: category.slug },
    image: { id: spec.id, path: url, url, mime_type: 'image/webp', size: 0 },
    ticket_combos: combos,
  };
}

export const DEMO_RAFFLES: Raffle[] = [
  { id: 31, categoryId: 1, title: 'Honda CBR1000RR Repsol 2015', image: 'cbr1000rr-repsol', goal: 49999, price: 100, minTickets: 4, maxTickets: 500, soldPct: 92, drawInHours: 7, packages: [4, 10, 25, 50] },
  { id: 32, categoryId: 1, title: 'Tesla Model Y Long Range 2024', image: 'tesla-model-y', goal: 99999, price: 150, minTickets: 2, maxTickets: 1000, soldPct: 84, drawInHours: 30, packages: [2, 6, 15, 40] },
  { id: 33, categoryId: 1, title: 'BMW M3 Competition 2021', image: 'bmw-m3-competition', goal: 74999, price: 125, minTickets: 4, maxTickets: 800, soldPct: 61, packages: [4, 10, 25, 60] },
  { id: 34, categoryId: 1, title: 'Aston Martin Vantage 2020', image: 'aston-martin-vantage', goal: 99999, price: 200, minTickets: 2, maxTickets: 600, soldPct: 38, packages: [2, 5, 12, 30] },
  { id: 35, categoryId: 1, title: 'Ford Ranger Wildtrak X 2024', image: 'ford-ranger-wildtrak', goal: 59999, price: 100, minTickets: 4, maxTickets: 1000, soldPct: 14, packages: [4, 10, 25, 50] },
  { id: 36, categoryId: 2, title: 'AirPods Max inalámbricos', image: 'airpods-max', goal: 9999, price: 50, minTickets: 5, maxTickets: 300, soldPct: 69, packages: [5, 10, 20, 40] },
  { id: 37, categoryId: 3, title: 'Rolex GMT-Master II Pepsi', image: 'rolex-gmt-master', goal: 14999, price: 250, minTickets: 2, maxTickets: 200, soldPct: 5, packages: [2, 5, 10, 20] },
  { id: 38, categoryId: 3, title: 'Garmin Fenix 8 AMOLED 47 mm', image: 'garmin-fenix-8', goal: 9999, price: 60, minTickets: 5, maxTickets: 300, soldPct: 0, packages: [5, 10, 20, 40] },
  { id: 39, categoryId: 5, title: 'Bono de compras de RD$ 50,000', image: 'bono-compras', goal: 9999, price: 40, minTickets: 5, maxTickets: 400, soldPct: 47, packages: [5, 10, 25, 50] },
  { id: 40, categoryId: 5, title: 'Bono de viaje de RD$ 150,000', image: 'bono-viaje', goal: 4999, price: 75, minTickets: 3, maxTickets: 100, soldPct: 100, packages: [3, 6, 10] },
].map(build);
