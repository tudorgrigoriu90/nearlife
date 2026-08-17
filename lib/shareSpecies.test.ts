import { buildShareMessage } from './shareSpecies';

describe('buildShareMessage', () => {
  it('names the species', () => {
    expect(buildShareMessage('Common Swift', 'en')).toContain('Common Swift');
  });

  it('stays honest — no real-time presence claim (invariant #1)', () => {
    const msg = buildShareMessage('Common Swift', 'en').toLowerCase();
    expect(msg).toContain('season'); // season-framed
    expect(msg).not.toContain('right now');
    expect(msg).not.toContain('here now');
  });

  it('carries no upsell (invariant #4)', () => {
    const msg = buildShareMessage('Common Swift', 'en').toLowerCase();
    for (const word of ['buy', 'upgrade', 'full game', 'unlock', 'premium']) {
      expect(msg).not.toContain(word);
    }
  });

  it('localizes to Swedish', () => {
    const sv = buildShareMessage('Tornseglare', 'sv');
    expect(sv).toContain('Tornseglare');
    expect(sv.toLowerCase()).toContain('säsong'); // Swedish copy, not the English fallback
  });
});
