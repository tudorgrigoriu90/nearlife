import { render, screen } from '@testing-library/react-native';
import BadgesScreen from './BadgesScreen';
import { createTranslator } from '../lib/i18n';
import type { CollectionRecord } from '../lib/collection';
import type { Species } from '../lib/species/types';

const tr = createTranslator('en');

// 2 birds + 1 mammal → "all 2 birds" + "all 1 mammal" + season opener + 6 spotted + 3 helped = 12.
const species: Species[] = [
  { id: 'swift', scientificName: 'Apus apus', commonName: 'Swift', category: 'bird', rarity: 'common', activeMonths: [6] },
  { id: 'robin', scientificName: 'Erithacus rubecula', commonName: 'Robin', category: 'bird', rarity: 'common', activeMonths: [6] },
  { id: 'fox', scientificName: 'Vulpes vulpes', commonName: 'Fox', category: 'mammal', rarity: 'common', activeMonths: [6] },
];
const NOW = new Date('2026-06-15T12:00:00Z');
const IN_SEASON = '2026-06-01T10:00:00Z';

function rec(id: string, over: Partial<CollectionRecord> = {}): CollectionRecord {
  return { speciesId: id, spottedAt: null, caughtAt: null, helpedAt: null, helpedKind: null, primeBonus: false, ...over };
}

describe('BadgesScreen', () => {
  it('shows every badge, locked with its progress, for an empty collection', async () => {
    await render(<BadgesScreen locale="en" species={species} records={[]} now={NOW} />);
    expect(screen.getByText(tr('badges.progress', { earned: 0, total: 12 }))).toBeTruthy();
    expect(screen.getByText(tr('badge.groupAll', { count: 2, category: 'birds' }))).toBeTruthy();
    expect(screen.getByText(tr('badge.seasonOpener'))).toBeTruthy();
    expect(screen.getAllByText(tr('badge.progressOf', { have: 0, count: 2 })).length).toBeGreaterThan(0);
  });

  it('earns the group badge, the season opener and nothing locked shows progress for them', async () => {
    const records = [rec('swift', { spottedAt: IN_SEASON }), rec('robin', { spottedAt: IN_SEASON })];
    await render(<BadgesScreen locale="en" species={species} records={records} now={NOW} />);
    // all 2 birds + season opener
    expect(screen.getByText(tr('badges.progress', { earned: 2, total: 12 }))).toBeTruthy();
  });

  it('counts a helped milestone as earned', async () => {
    const records = [rec('fox', { spottedAt: IN_SEASON, helpedAt: 't', helpedKind: 'give' })];
    await render(<BadgesScreen locale="en" species={species} records={records} now={NOW} />);
    // all 1 mammal + season opener + helped-1
    expect(screen.getByText(tr('badges.progress', { earned: 3, total: 12 }))).toBeTruthy();
  });
});
