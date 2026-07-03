import {
  candidateSpecies,
  pickWeighted,
  selectNotificationSpecies,
  weightFor,
} from './notification';
import type { Species } from './species/types';

function sp(id: string, rarity: Species['rarity'], activeMonths: number[]): Species {
  return {
    id,
    scientificName: `Genus ${id}`,
    commonName: id,
    category: 'bird',
    rarity,
    activeMonths: activeMonths as Species['activeMonths'],
  };
}

const swift = sp('swift', 'common', [6, 7, 8]);
const crane = sp('crane', 'uncommon', [6, 7, 8]);
const osprey = sp('osprey', 'rare', [6, 7, 8]);
const winterBird = sp('fieldfare', 'common', [12, 1, 2]);

describe('candidateSpecies', () => {
  it('applies the season gate', () => {
    const ids = candidateSpecies([swift, winterBird], 7, new Set()).map((s) => s.id);
    expect(ids).toEqual(['swift']);
  });

  it('dedupes against the collection', () => {
    const ids = candidateSpecies([swift, crane], 7, new Set(['swift'])).map((s) => s.id);
    expect(ids).toEqual(['crane']);
  });
});

describe('weightFor', () => {
  it('boosts rarer species', () => {
    expect(weightFor(osprey)).toBeGreaterThan(weightFor(crane));
    expect(weightFor(crane)).toBeGreaterThan(weightFor(swift));
  });
});

describe('pickWeighted', () => {
  it('returns null for an empty candidate set', () => {
    expect(pickWeighted([], () => 0)).toBeNull();
  });

  it('picks the first candidate when rng is 0', () => {
    expect(pickWeighted([swift, crane, osprey], () => 0)?.id).toBe('swift');
  });

  it('walks the cumulative distribution by weight', () => {
    // weights: swift 1, crane 2, osprey 4 → total 7.
    // rng * 7 lands in: [0,1) swift, [1,3) crane, [3,7) osprey.
    expect(pickWeighted([swift, crane, osprey], () => 0.5 / 7)?.id).toBe('swift');
    expect(pickWeighted([swift, crane, osprey], () => 2 / 7)?.id).toBe('crane');
    expect(pickWeighted([swift, crane, osprey], () => 5 / 7)?.id).toBe('osprey');
  });
});

describe('selectNotificationSpecies', () => {
  it('returns null when everything active is already collected', () => {
    const result = selectNotificationSpecies([swift], 7, new Set(['swift']), () => 0);
    expect(result).toBeNull();
  });

  it('returns null when nothing is in season', () => {
    expect(selectNotificationSpecies([winterBird], 7, new Set(), () => 0)).toBeNull();
  });

  it('selects a season-gated, undeduped species deterministically', () => {
    const result = selectNotificationSpecies([swift, crane, osprey], 7, new Set(['swift']), () => 0);
    // swift removed by dedupe → candidates [crane, osprey], rng 0 → first → crane
    expect(result?.id).toBe('crane');
  });
});
