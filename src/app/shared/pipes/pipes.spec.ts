import { MaskSensitivePipe } from './mask-sensitive.pipe';
import { MoneyFormatPipe } from './money-format.pipe';

describe('MoneyFormatPipe', () => {
  const pipe = new MoneyFormatPipe();

  it('formats amounts with two decimals and thousands separators', () => {
    expect(pipe.transform('150')).toBe('150.00');
    expect(pipe.transform(1500)).toBe('1,500.00');
    expect(pipe.transform('RD$ 7,500.5')).toBe('7,500.50');
  });

  it('formats integers without decimals', () => {
    expect(pipe.transform(99999, 'integer')).toBe('99,999');
    expect(pipe.transform('1000.9', 'integer')).toBe('1,000');
  });

  it('returns an empty string when the value is not a number', () => {
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform('x')).toBe('');
  });
});

describe('MaskSensitivePipe', () => {
  const pipe = new MaskSensitivePipe();

  it('keeps only the last four digits of a phone', () => {
    expect(pipe.transform('18095551234')).toBe('*******1234');
    expect(pipe.transform('8095551234', 'phone')).toBe('******1234');
  });

  it('keeps the last four characters of the email name and the full domain', () => {
    expect(pipe.transform('maria@example.com', 'email')).toBe('*aria@example.com');
    expect(pipe.transform('ana@example.com', 'email')).toBe('ana@example.com');
  });

  it('handles empty values and non-email text safely', () => {
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform('   ')).toBe('');
    expect(pipe.transform('not-an-email', 'email')).toBe('not-an-email');
  });
});
