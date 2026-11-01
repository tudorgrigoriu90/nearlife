import { asTitleName } from './displayName';

// T-236: Swedish (and many other languages) write species names in lower case in running text —
// "gräsand" — so lists mixed "gräsand" with "Abborre" from curated data. Names shown as titles or
// list headings start with a capital, everywhere; the rest of the name is left exactly as sourced.
describe('asTitleName', () => {
  it('capitalises only the first letter', () => {
    expect(asTitleName('gräsand')).toBe('Gräsand');
    expect(asTitleName('större hackspett')).toBe('Större hackspett');
    expect(asTitleName('Abborre')).toBe('Abborre');
  });

  it('handles a first letter outside ASCII and the Turkish dotted i', () => {
    expect(asTitleName('ödla')).toBe('Ödla');
    expect(asTitleName('ırmak', 'tr')).toBe('Irmak');
    expect(asTitleName('ibis', 'tr')).toBe('İbis');
  });

  it('leaves scripts without case and empty names alone', () => {
    expect(asTitleName('الدوري')).toBe('الدوري');
    expect(asTitleName('')).toBe('');
  });
});
