import { formatDrawDetail, formatWhen, foldText, parseAmount, parseDate } from './format';

describe('format utils', () => {
  describe('parseAmount', () => {
    it('reads plain numbers and numeric strings', () => {
      expect(parseAmount(150)).toBe(150);
      expect(parseAmount('150.00')).toBe(150);
    });

    it('ignores the RD$ prefix and thousands separators', () => {
      expect(parseAmount('RD$ 1,050.00')).toBe(1050);
      expect(parseAmount('rd$2,025')).toBe(2025);
    });

    it('returns null for empty or non numeric input', () => {
      expect(parseAmount(null)).toBeNull();
      expect(parseAmount('')).toBeNull();
      expect(parseAmount('abc')).toBeNull();
      expect(parseAmount(NaN)).toBeNull();
    });
  });

  describe('parseDate', () => {
    it('keeps explicit timezones', () => {
      expect(parseDate('2026-10-20T02:00:00.000000Z')?.toISOString()).toBe('2026-10-20T02:00:00.000Z');
    });

    it('treats values without timezone as Dominican time (UTC-4)', () => {
      expect(parseDate('2026-10-20 10:00')?.toISOString()).toBe('2026-10-20T14:00:00.000Z');
    });

    it('returns null for garbage', () => {
      expect(parseDate('')).toBeNull();
      expect(parseDate('not a date')).toBeNull();
    });
  });

  describe('formatWhen', () => {
    it('renders day, short month, year and a lowercase 12h time in Dominican time', () => {
      expect(formatWhen('2026-09-19T23:48:55.000000Z')).toBe('19 sept 2026 - 7:48 pm');
    });

    it('returns an empty string for missing or invalid values', () => {
      expect(formatWhen(null)).toBe('');
      expect(formatWhen('nope')).toBe('');
    });
  });

  describe('formatDrawDetail', () => {
    it('labels draw and closing dates differently', () => {
      const iso = '2026-10-20T02:00:00.000Z';
      expect(formatDrawDetail(iso, 'sorteo').startsWith('Sorteo: ')).toBeTrue();
      expect(formatDrawDetail(iso, 'cierre').startsWith('Cierra: ')).toBeTrue();
      expect(formatDrawDetail(null)).toBe('');
    });
  });

  it('foldText removes accents and lowercases', () => {
    expect(foldText('Teléfonos Vehículos')).toBe('telefonos vehiculos');
  });
});
