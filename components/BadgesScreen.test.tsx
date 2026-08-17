import { render, screen } from '@testing-library/react-native';
import BadgesScreen from './BadgesScreen';
import { createTranslator } from '../lib/i18n';
import type { CollectionRecord } from '../lib/collection';
import type { Species } from '../lib/species/types';

const tr = createTranslator('en');

// 2 birds + 1 mammal → 2 category badges + 3 spotted + 3 helped milestones = 8 total.
const species: Species[] = [
  { id: 'swift', scientificName: 'Apus apus', commonName: 'Swift', category: 'bird', rarity: 'common', activeMonths: [6] },
  { id: 'robin', scientificName: 'Erithacus rubecula', commonName: 'Robin', category: 'bird', rarity: 'common', activeMonths: [6] },
  { id: 'fox', scientificName: 'Vulpes vulpes', commonName: 'Fox', category: 'mammal', rarity: 'common', activeMonths: [6] },
];

function rec(id: string, over: Partial<CollectionRecord> = {}): CollectionRecord {
  return { speciesId: id, spottedAt: null, caughtAt: null, helpedAt: null, helpedKind: null, primeBonus: false, ...over };
}

describe('BadgesScreen', () => {
  it('shows every badge and 0 earned for an empty collection', async () => {
    await render(<BadgesScreen locale="en" species={species} records={[]} />);
    expect(screen.getByText(tr('badges.progress', { earned: 0, total: 8 }))).toBeTruthy();
    // A category goal and a milestone goal are both shown (as locked targets).
    expect(screen.getByText(tr('badge.category', { category: tr('category.bird') }))).toBeTruthy();
    expect(screen.getByText(tr('badge.helped', { count: 1 }))).toBeTruthy();
  });

  it('counts a completed category as earned', async () => {
    // Spot both birds → the bird-category badge is earned (the mammal isn't).
    const records = [rec('swift', { spottedAt: 't' }), rec('robin', { spottedAt: 't' })];
    await render(<BadgesScreen locale="en" species={species} records={records} />);
    expect(screen.getByText(tr('badges.progress', { earned: 1, total: 8 }))).toBeTruthy();
  });

  it('counts a helped milestone as earned', async () => {
    const records = [rec('fox', { spottedAt: 't', helpedAt: 't', helpedKind: 'give' })];
    await render(<BadgesScreen locale="en" species={species} records={records} />);
    // helped-1 earned (fox category needs the single mammal spotted too → also earned): 2 badges.
    expect(screen.getByText(tr('badges.progress', { earned: 2, total: 8 }))).toBeTruthy();
  });
});
