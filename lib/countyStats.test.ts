import { countyStats, seasonShape } from './countyStats';
import type { Species } from './species/types';

const sp = (
  id: string,
  group: Species['category'],
  occurrences: number,
  monthCounts: number[] | null = null,
): Species =>
  ({
    id,
    scientificName: id,
    commonName: id,
    category: group,
    rarity: 'common',
    activeMonths: [5],
    county: { occurrences, monthCounts },
  }) as Species;

// T-262: the card's county section, from sightings per month (T-261).
describe('seasonShape', () => {
  it('a resident: seen all year, peak around the busiest month', () => {
    const tit = [80, 85, 100, 90, 70, 60, 50, 50, 60, 70, 75, 80];
    expect(seasonShape(tit)).toEqual({ kind: 'allYear', peak: [2, 3, 4], visitor: null });
  });

  it('a summer migrant: from arrival to departure, peak in late spring', () => {
    const warbler = [0, 0, 0, 30, 400, 300, 150, 60, 20, 0, 0, 0];
    expect(seasonShape(warbler, 'bird')).toEqual({
      kind: 'season',
      from: 4,
      to: 9,
      peak: [5, 6],
      visitor: 'summer',
    });
  });

  it('a winter visitor spans the new year', () => {
    const waxwing = [300, 250, 120, 20, 0, 0, 0, 0, 0, 30, 200, 280];
    expect(seasonShape(waxwing, 'bird')).toEqual({
      kind: 'season',
      from: 10,
      to: 4,
      peak: [12, 1, 2],
      visitor: 'winter',
    });
  });

  it('only birds are called visitors; a plant is simply seen in its months', () => {
    const orchid = [0, 0, 0, 0, 40, 120, 90, 10, 0, 0, 0, 0];
    expect(seasonShape(orchid, 'plant')).toEqual({
      kind: 'season',
      from: 5,
      to: 8,
      peak: [6, 7],
      visitor: null,
    });
  });

  it('a stray record far below the peak does not stretch the season', () => {
    // January and December's single records are under 5% of June's 200; September's 10 is not.
    const butterfly = [1, 0, 0, 5, 80, 200, 180, 90, 10, 0, 0, 1];
    expect(seasonShape(butterfly, 'insect')).toMatchObject({
      kind: 'season',
      from: 5,
      to: 9,
      peak: [6, 7],
    });
  });

  it('no data, no shape', () => {
    expect(seasonShape(new Array(12).fill(0))).toBeNull();
  });
});

describe('countyStats', () => {
  const birds = [
    sp('a', 'bird', 5000, [80, 85, 100, 90, 70, 60, 50, 50, 60, 70, 75, 80]),
    sp('b', 'bird', 3000),
    sp('c', 'bird', 900),
    ...Array.from({ length: 40 }, (_, i) => sp(`r${i}`, 'bird', 40 - i)),
    sp('fox', 'mammal', 9000),
  ];

  it('ranks a species among its own group in the county', () => {
    const stats = countyStats(birds[2], birds)!;
    expect(stats.standing).toEqual({ kind: 'rank', rank: 3, total: 43, occurrences: 900 });
  });

  it('calls the bottom of the list uncommon, with its record count', () => {
    const stats = countyStats(birds[42], birds)!;
    expect(stats.standing).toEqual({ kind: 'uncommon', occurrences: 1 });
  });

  it('the middle of a long list gets just its record count', () => {
    const many = [...birds, ...Array.from({ length: 60 }, (_, i) => sp(`m${i}`, 'bird', 500 - i))];
    const stats = countyStats(
      many.find((s) => s.id === 'm40')!,
      many,
    )!;
    expect(stats.standing).toEqual({ kind: 'records', occurrences: 460 });
  });

  it('carries the season when months are known, and nothing for a species from no county', () => {
    expect(countyStats(birds[0], birds)?.season).toMatchObject({ kind: 'allYear' });
    expect(countyStats(birds[1], birds)?.season).toBeNull();
    expect(countyStats({ ...birds[0], county: undefined }, birds)).toBeNull();
  });

  it('too few records for a season shape is not shown as one', () => {
    const thin = sp('t', 'bird', 6, [0, 0, 0, 0, 3, 3, 0, 0, 0, 0, 0, 0]);
    expect(countyStats(thin, [...birds, thin])?.season).toBeNull();
  });
});
