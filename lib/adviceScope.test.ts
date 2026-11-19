import type { CollectionRecord } from './collection';
import { adviceScope, distinctActions } from './adviceScope';
import { KRONOBERG_SPECIES } from './species/kronoberg';

// T-319 · review B-67: help and protect advice is written per species for the curated set only;
// every other species shows its group's advice, and the app says so and counts it as one action.

const rec = (speciesId: string, kind: 'give' | 'protect'): CollectionRecord => ({
  speciesId,
  spottedAt: 't',
  caughtAt: null,
  helpedAt: 't',
  helpedKind: kind,
  primeBonus: false,
});

describe('adviceScope', () => {
  it('the curated species have their own advice', () => {
    expect(adviceScope(KRONOBERG_SPECIES[0].id)).toBe('species');
  });

  it('a catalogue species shows its group’s advice', () => {
    expect(adviceScope('gbif:2480528')).toBe('group');
  });
});

describe('distinctActions', () => {
  const groups: Record<string, 'bird' | 'mammal'> = { 'gbif:1': 'bird', 'gbif:2': 'bird', 'gbif:3': 'mammal' };
  const groupOf = (id: string) => groups[id] ?? null;

  it('ten pledges of the same bird action are one action', () => {
    expect(distinctActions([rec('gbif:1', 'give'), rec('gbif:2', 'give')], groupOf)).toBe(1);
  });

  it('give and protect, and different groups, are different actions', () => {
    expect(
      distinctActions([rec('gbif:1', 'give'), rec('gbif:2', 'protect'), rec('gbif:3', 'give')], groupOf),
    ).toBe(3);
  });

  it('curated advice counts per species', () => {
    const [a, b] = KRONOBERG_SPECIES.filter((s) => s.category === 'bird');
    expect(distinctActions([rec(a.id, 'give'), rec(b.id, 'give')], () => 'bird')).toBe(2);
  });

  it('a species of unknown group counts on its own', () => {
    expect(distinctActions([rec('gbif:9', 'give'), rec('gbif:8', 'give')], () => null)).toBe(2);
  });

  it('only helped records count', () => {
    expect(distinctActions([{ ...rec('gbif:1', 'give'), helpedAt: null, helpedKind: null }], groupOf)).toBe(0);
  });
});
