import type { CollectionRecord } from './collection';
import { categoryBadgeId, earnedBadges } from './badges';
import type { Species } from './species/types';

function sp(id: string, category: Species['category']): Species {
  return { id, scientificName: id, commonName: id, category, rarity: 'common', activeMonths: [1] };
}

function spotted(id: string, extra: Partial<CollectionRecord> = {}): CollectionRecord {
  return {
    speciesId: id, spottedAt: 't', caughtAt: null, helpedAt: null, helpedKind: null, primeBonus: false,
    ...extra,
  };
}

const species: Species[] = [sp('a', 'bird'), sp('b', 'bird'), sp('c', 'plant')];

describe('earnedBadges', () => {
  it('earns nothing for an empty collection', () => {
    expect(earnedBadges([], species)).toEqual([]);
  });

  it('earns a category badge when every species in the category is spotted', () => {
    const earned = earnedBadges([spotted('a'), spotted('b')], species);
    expect(earned).toContain(categoryBadgeId('bird'));
    expect(earned).not.toContain(categoryBadgeId('plant'));
  });

  it('earns spotted-count milestones', () => {
    const many = Array.from({ length: 25 }, (_, i) => spotted(`s${i}`));
    const earned = earnedBadges(many, species);
    expect(earned).toContain('spotted-10');
    expect(earned).toContain('spotted-25');
    expect(earned).not.toContain('spotted-50');
  });

  it('earns helped-count milestones and counts helped records only', () => {
    const records = [
      spotted('a', { helpedAt: 't', helpedKind: 'give' }),
      spotted('b', { helpedAt: 't', helpedKind: 'protect' }),
      spotted('c'), // spotted but not helped
    ];
    const earned = earnedBadges(records, species);
    expect(earned).toContain('helped-1');
    expect(earned).not.toContain('helped-5');
  });
});
