import type { CollectionRecord } from './collection';
import { badgeStatuses, earnedBadges, groupTiers, GROUP_TIERS, SPOTTED_MILESTONES } from './badges';
import type { Species } from './species/types';

// T-212 (Director, 2026-10-31): tiers per group instead of "every species in the group", which
// stopped being reachable once a county list held ~2,900 species.

function sp(id: string, category: Species['category'], group?: Species['group']): Species {
  return { id, scientificName: id, commonName: id, category, rarity: 'common', activeMonths: [1], ...(group ? { group } : {}) };
}

function spotted(id: string, extra: Partial<CollectionRecord> = {}): CollectionRecord {
  return { speciesId: id, spottedAt: '2026-06-01T10:00:00Z', caughtAt: null, helpedAt: null, helpedKind: null, primeBonus: false, ...extra };
}

const NOW = new Date('2026-06-15T12:00:00Z');
const birds = (n: number) => Array.from({ length: n }, (_, i) => sp(`bird${i}`, 'bird'));

describe('groupTiers', () => {
  it('is bronze/silver/gold at 10/50/150 for a big group', () => {
    expect(GROUP_TIERS).toEqual([10, 50, 150]);
    expect(groupTiers(300)).toEqual([10, 50, 150]);
  });

  it('adds "all of them" for a group small enough to finish', () => {
    expect(groupTiers(50)).toEqual([10, 50]);
    expect(groupTiers(12)).toEqual([10, 12]);
    expect(groupTiers(6)).toEqual([6]);
    expect(groupTiers(150)).toEqual([10, 50, 150]);
  });
});

describe('badgeStatuses', () => {
  it('earns a group tier from the species spotted in that group', () => {
    const species = [...birds(60), sp('snail', 'plant', 'mollusc')];
    const records = Array.from({ length: 12 }, (_, i) => spotted(`bird${i}`));
    const bird = badgeStatuses(records, species, NOW).filter((b) => b.kind === 'group-tier' && b.group === 'bird');
    // 60 birds: bronze 10, silver 50, and "all 60" (a group of ≤ 150 can be finished).
    expect(bird.map((b) => [b.count, b.earned, b.progress, b.all])).toEqual([
      [10, true, 10, false],
      [50, false, 12, false],
      [60, false, 12, true],
    ]);
  });

  it('marks the completion tier of a small group as "all"', () => {
    const reptiles = Array.from({ length: 6 }, (_, i) => sp(`r${i}`, 'mammal', 'reptile'));
    const statuses = badgeStatuses(reptiles.map((r) => spotted(r.id)), reptiles, NOW);
    expect(statuses.find((b) => b.group === 'reptile')).toMatchObject({ count: 6, all: true, earned: true });
  });

  it('counts only species in the list, so a spot elsewhere never earns a tier here', () => {
    const species = birds(20);
    const records = Array.from({ length: 10 }, (_, i) => spotted(`elsewhere${i}`));
    expect(badgeStatuses(records, species, NOW).find((b) => b.group === 'bird')?.earned).toBe(false);
  });

  it('earns the season opener for a spot in the current season only', () => {
    const species = birds(3);
    const thisSeason = badgeStatuses([spotted('bird0')], species, NOW).find((b) => b.kind === 'season-opener');
    const lastYear = badgeStatuses([spotted('bird0', { spottedAt: '2025-06-01T10:00:00Z' })], species, NOW).find(
      (b) => b.kind === 'season-opener',
    );
    expect(thisSeason?.earned).toBe(true);
    expect(lastYear?.earned).toBe(false);
  });

  it('keeps overall spotted milestones, now reaching 500 for a big catalogue', () => {
    expect(SPOTTED_MILESTONES).toEqual([10, 25, 50, 100, 250, 500]);
    const many = Array.from({ length: 30 }, (_, i) => spotted(`s${i}`));
    const ids = earnedBadges(many, birds(1), NOW);
    expect(ids).toContain('spotted-25');
    expect(ids).not.toContain('spotted-50');
  });

  it('counts helped records only for helped milestones', () => {
    const records = [spotted('bird0', { helpedAt: 't', helpedKind: 'give' }), spotted('bird1')];
    const ids = earnedBadges(records, birds(2), NOW);
    expect(ids).toContain('helped-1');
    expect(ids).not.toContain('helped-5');
  });

  it('earns nothing for an empty collection', () => {
    expect(earnedBadges([], birds(5), NOW)).toEqual([]);
  });
});
