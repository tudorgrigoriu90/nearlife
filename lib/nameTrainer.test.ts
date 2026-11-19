import { CARDS_PER_DAY, REVIEW_DAYS, answer, parseTrainer, todaysQueue, trainerLocale, trainerNames } from './nameTrainer';
import type { Species } from './species/types';

// T-351 · review F-06: learn species names, Swedish beside the second language.
describe('name trainer schedule', () => {
  it('brings a "learning" card back after 1, then 3, then 7 days', () => {
    expect(REVIEW_DAYS).toEqual([1, 3, 7]);
    let s = answer({}, 'owl', 'learning', '2026-11-01');
    expect(s.owl).toEqual({ due: '2026-11-02', reviews: 1 });
    s = answer(s, 'owl', 'learning', '2026-11-02');
    expect(s.owl).toHaveProperty('due', '2026-11-05');
    s = answer(s, 'owl', 'learning', '2026-11-05');
    expect(s.owl).toHaveProperty('due', '2026-11-12');
    s = answer(s, 'owl', 'learning', '2026-11-12');
    expect(s.owl).toHaveProperty('due', '2026-11-19'); // stays at a week
  });

  it('"knew it" retires a card', () => {
    const s = answer(answer({}, 'owl', 'learning', '2026-11-01'), 'owl', 'knew', '2026-11-02');
    expect(s.owl).toEqual({ known: true, reviews: 2 });
  });

  it('today: due cards first, then new species, at most ten, never a known one', () => {
    const state = {
      a: { due: '2026-11-03', reviews: 1 },
      b: { due: '2026-11-09', reviews: 2 }, // not yet
      c: { known: true as const, reviews: 1 },
    };
    const spotted = ['a', 'b', 'c', ...Array.from({ length: 20 }, (_, i) => `n${i}`)];
    const q = todaysQueue(spotted, state, '2026-11-05');
    expect(q[0]).toBe('a');
    expect(q).not.toContain('b');
    expect(q).not.toContain('c');
    expect(q).toHaveLength(CARDS_PER_DAY);
  });

  it('reads back only well-formed state', () => {
    expect(parseTrainer(JSON.stringify({ a: { due: '2026-11-03', reviews: 1 }, b: { known: true, reviews: 2 }, c: 5 }))).toEqual({
      a: { due: '2026-11-03', reviews: 1 },
      b: { known: true, reviews: 2 },
    });
    expect(parseTrainer('{bad')).toEqual({});
  });
});

describe('name trainer languages', () => {
  it('pairs Swedish with the second language, else the app language, else English', () => {
    expect(trainerLocale('sv', 'ar')).toBe('ar');
    expect(trainerLocale('en', null)).toBe('en');
    expect(trainerLocale('sv', null)).toBe('en');
    expect(trainerLocale('en', 'sv')).toBe('en');
  });

  const sp = (over: Partial<Species>): Species =>
    ({ id: 'x', scientificName: 'Strix aluco', commonName: 'Tawny Owl', ...over }) as Species;

  it('uses only species with a sourced name in both languages', () => {
    expect(trainerNames(sp({ names: { sv: 'kattuggla' } }), 'en')).toEqual({ sv: 'Kattuggla', other: 'Tawny Owl' });
    // No Swedish name.
    expect(trainerNames(sp({}), 'en')).toBeNull();
    // The English "name" is only the binomial.
    expect(trainerNames(sp({ commonName: 'Strix aluco', names: { sv: 'kattuggla' } }), 'en')).toBeNull();
    // No name in the second language.
    expect(trainerNames(sp({ names: { sv: 'kattuggla' } }), 'so')).toBeNull();
  });
});
