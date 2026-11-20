import { shareCardLines } from './shareCard';
import { createTranslator } from './i18n';
import type { Species } from './species/types';

// T-368 · review F-14: what the shared image says.
const tr = createTranslator('en');
const photo = { speciesId: 'owl', url: 'https://x/owl.jpg', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Owl.jpg', license: 'CC-BY-SA-4.0', author: 'A. Photographer', isPrimary: true };
const owl = { id: 'owl', scientificName: 'Strix aluco', commonName: 'Tawny Owl', category: 'bird', rarity: 'common', activeMonths: [1] } as unknown as Species;

describe('shareCardLines', () => {
  it('names the species, the county in season words, the app, and credits the photo', () => {
    const lines = shareCardLines({ ...owl, photo } as Species, 'en', 'Kronoberg');
    expect(lines.name).toBe('Tawny Owl');
    expect(lines.season).toBe(tr('share.card.season', { county: 'Kronoberg' }));
    expect(lines.app).toBe(tr('share.card.app'));
    expect(lines.credit).toContain('A. Photographer');
    expect(lines.credit).toContain('CC-BY-SA-4.0');
  });

  it('says Sweden without a county, and has no credit without a photo', () => {
    const lines = shareCardLines(owl, 'en', null);
    expect(lines.season).toBe(tr('share.card.seasonSweden'));
    expect(lines.credit).toBeNull();
  });
});
