jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
import { songCandidates, songRound } from './songQuiz';
import type { Species } from './species/types';

const photo = (id: string) => ({
  speciesId: id,
  url: `https://x/${id}.jpg`,
  sourceUrl: 's',
  license: 'CC-BY' as const,
  author: 'a',
  isPrimary: true,
});
const bird = (id: string, sci: string, months = [5], withPhoto = true): Species =>
  ({
    id,
    scientificName: sci,
    commonName: id,
    category: 'bird',
    rarity: 'common',
    activeMonths: months,
    photo: withPhoto ? photo(id) : undefined,
  }) as Species;

const tit = bird('tit', 'Parus major');
const blue = bird('blue', 'Cyanistes caeruleus');
const robin = bird('robin', 'Erithacus rubecula');
const finch = bird('finch', 'Fringilla coelebs');
const winterOnly = bird('waxwing', 'Bombycilla garrulus', [1]);
const noPhoto = bird('nophoto', 'Sitta europaea', [5], false);
const moose = { ...bird('moose', 'Alces alces'), category: 'mammal' } as Species;
const pool = [tit, blue, robin, finch, winterOnly, noPhoto, moose];
const all = new Set(pool.map((s) => s.id));

// T-247: whose song is this?
describe('songCandidates', () => {
  it('takes birds with a recording and a photo, active this month first', () => {
    const ids = songCandidates(pool, all, 5).map((s) => s.id);
    expect(ids).toEqual(['tit', 'blue', 'robin', 'finch']);
  });

  it('falls back to any month, and skips birds without a recording', () => {
    expect(songCandidates(pool, new Set(['waxwing', 'tit']), 1).map((s) => s.id)).toEqual(['waxwing']);
    expect(songCandidates(pool, new Set(['waxwing']), 5).map((s) => s.id)).toEqual(['waxwing']);
    expect(songCandidates(pool, new Set(), 5)).toEqual([]);
  });
});

describe('songRound', () => {
  const candidates = songCandidates(pool, all, 5);

  it('gives the target among four bird photos', () => {
    const round = songRound(candidates, pool, 5, '2026-11-05:0')!;
    expect(round.options).toHaveLength(4);
    expect(round.options.map((s) => s.id)).toContain(round.target.id);
    expect(round.options.every((s) => s.category === 'bird' && s.photo)).toBe(true);
  });

  it('is stable for a seed and does not repeat the last target', () => {
    const a = songRound(candidates, pool, 5, 'seed')!;
    expect(songRound(candidates, pool, 5, 'seed')).toEqual(a);
    for (let i = 0; i < 20; i++) {
      expect(songRound(candidates, pool, 5, `s${i}`, a.target.id)!.target.id).not.toBe(a.target.id);
    }
  });

  it('is null with nothing to play or too few birds to choose from', () => {
    expect(songRound([], pool, 5, 's')).toBeNull();
    expect(songRound([tit], [tit, blue, moose], 5, 's')).toBeNull();
  });
});
