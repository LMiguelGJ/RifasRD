/** Formatting helpers shared across pages (ported from the production site). */

/** All dates are shown in the Dominican Republic timezone. */
export const SITE_TIMEZONE = 'America/Santo_Domingo';
const SITE_UTC_OFFSET = '-04:00';

/** Parses "1,234.50", "RD$ 150", numbers and numeric strings. Returns null when not a number. */
export function parseAmount(value: unknown): number | null {
  if (value == null || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const cleaned = String(value).trim().replace(/^rd\$\s*/i, '').replace(/,/g, '').trim();
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

/** Parses ISO strings; values without a timezone are interpreted as Dominican time. */
export function parseDate(value: string): Date | null {
  const raw = value.trim();
  if (!raw) return null;
  if (/[zZ]$/.test(raw) || /[+-]\d{2}:?\d{2}$/.test(raw)) {
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const iso = raw.includes('T') ? raw : raw.replace(' ', 'T');
  const withSeconds = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(iso) ? `${iso}:00` : iso;
  const d = new Date(`${withSeconds}${SITE_UTC_OFFSET}`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "19 sept 2026 - 7:48 pm" */
export function formatWhen(value: string | Date | number | null | undefined): string {
  if (value == null || value === '') return '';
  const date = value instanceof Date ? value : typeof value === 'string' ? parseDate(value) : new Date(value);
  if (!date || Number.isNaN(date.getTime())) return '';
  const parts = new Intl.DateTimeFormat('es', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: SITE_TIMEZONE,
  }).formatToParts(date);
  let day = '';
  let month = '';
  let year = '';
  for (const p of parts) {
    if (p.type === 'day') day = p.value;
    if (p.type === 'month') month = p.value.replace(/\./g, '').trim().toLowerCase();
    if (p.type === 'year') year = p.value;
  }
  const time = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: SITE_TIMEZONE,
  })
    .format(date)
    .toLowerCase();
  return `${[day, month, year].filter(Boolean).join(' ')} - ${time}`;
}

/** "Sorteo: 19 oct de 2026, 10:00 p. m." / "Cierra: …" */
export function formatDrawDetail(iso: string | null, kind?: 'sorteo' | 'cierre'): string {
  if (!iso) return '';
  const text = new Date(iso).toLocaleString('es-DO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: SITE_TIMEZONE,
  });
  return kind === 'cierre' ? `Cierra: ${text}` : `Sorteo: ${text}`;
}

/** Strips accents and lowercases, for loose text matching. */
export function foldText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}
