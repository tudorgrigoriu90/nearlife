import { groupOf } from './group';
import { speciesRowToSpecies } from '../speciesRepository';
import { almanacEntries, categoryCounts } from '../almanac';
import { earnedBadges } from '../badges';
import { speciesGlyph } from '../../components/speciesVisual';
import type { Species } from './types';

// T-221: 679 catalogue species (spiders, snails, frogs, lizards) have no catch-game category of
// their own. They borrow one for the minigame, but they must not be shown or filed as it: a snail
// was a 🌼 under Plants.

function row(taxon_group: string | null, category: Species['category'] | null = null) {
  return {
    id: `gbif:${taxon_group}`,
    scientific_name: 'X y',
    common_name: null,
    category,
    rarity: 'common' as const,
    active_months: [5],
    taxon_group,
  };
}

describe('species groups (T-221)', () => {
  it('a database species is grouped by its taxon, not by the minigame it borrows', () => {
    const snail = speciesRowToSpecies(row('mollusc'));
    expect(snail.category).toBe('plant'); // the minigame stays as it was
    expect(groupOf(snail)).toBe('mollusc');
    expect(groupOf(speciesRowToSpecies(row('arachnid')))).toBe('arachnid');
    expect(groupOf(speciesRowToSpecies(row('amphibian')))).toBe('amphibian');
    expect(groupOf(speciesRowToSpecies(row('reptile')))).toBe('reptile');
  });

  it('a species with its own category is grouped by it', () => {
    expect(groupOf(speciesRowToSpecies(row('bird', 'bird')))).toBe('bird');
    expect(groupOf({ category: 'fungus' } as Species)).toBe('fungus');
  });

  it('each group has its own glyph', () => {
    expect(speciesGlyph('mollusc', true)).toBe('🐌');
    expect(speciesGlyph('arachnid', true)).toBe('🕷️');
    expect(speciesGlyph('amphibian', true)).toBe('🐸');
    expect(speciesGlyph('reptile', true)).toBe('🦎');
  });

  it('the almanac files a snail under molluscs, not plants', () => {
    const species = [speciesRowToSpecies(row('mollusc')), speciesRowToSpecies(row('plant', 'plant'))];
    species[1] = { ...species[1], id: 'gbif:plant2' };
    expect(almanacEntries(species, [], 'plant').map((e) => e.species.id)).toEqual(['gbif:plant2']);
    expect(almanacEntries(species, [], 'mollusc').map((e) => e.species.id)).toEqual(['gbif:mollusc']);
    expect(categoryCounts(species, []).map((c) => c.category)).toEqual(['mollusc', 'plant']);
  });

  it('group badges count by group', () => {
    const snail = speciesRowToSpecies(row('mollusc'));
    const records = [{ speciesId: snail.id, spottedAt: 't', caughtAt: null, helpedAt: null, helpedKind: null, primeBonus: false }];
    expect(earnedBadges(records, [snail])).toContain('group-mollusc-1'); // "all 1 snail" (T-212)
  });
});
