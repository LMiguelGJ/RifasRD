import { VerificarBoletoComponent } from './verificar-boleto.component';

describe('VerificarBoletoComponent lookup body', () => {
  const build = VerificarBoletoComponent.buildLookupBody;

  it('searches by phone for 10 digits, ignoring separators', () => {
    expect(build('809-555-1234')).toEqual({ phone: '8095551234' });
    expect(build('(809) 555 1234')).toEqual({ phone: '8095551234' });
  });

  it('drops the country code from 11 digit numbers that start with 1', () => {
    expect(build('18095551234')).toEqual({ phone: '8095551234' });
  });

  it('treats anything else as a ticket number without spaces', () => {
    expect(build('29041')).toEqual({ ticket_number: '29041' });
    expect(build('0001 234')).toEqual({ ticket_number: '0001234' });
  });

  it('returns null for empty input', () => {
    expect(build('   ')).toBeNull();
  });

  it('only accepts 10 digits, or 11 starting with 1, as a phone', () => {
    expect(VerificarBoletoComponent.normalizePhoneForLookup('809555123')).toBeNull();
    expect(VerificarBoletoComponent.normalizePhoneForLookup('28095551234')).toBeNull();
  });
});
