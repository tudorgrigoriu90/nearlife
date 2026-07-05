import { buildDataExport, EXPORT_FORMAT, exportToJson } from './dataExport';
import { DEFAULT_CONSENT, grant } from './consent';
import type { CollectionRecord } from './collection';

const collection: CollectionRecord[] = [
  { speciesId: 'pike', spottedAt: 't', caughtAt: 't', helpedAt: null, helpedKind: null, primeBonus: true },
  { speciesId: 'barn-swallow', spottedAt: 't', caughtAt: null, helpedAt: null, helpedKind: null, primeBonus: false },
];

describe('buildDataExport', () => {
  it('bundles the user data in a stable, versioned shape', () => {
    const data = buildDataExport({
      exportedAt: '2026-07-05T00:00:00.000Z',
      profile: { homeRegion: 'kronoberg' },
      consent: grant(DEFAULT_CONSENT, 'analytics'),
      collection,
    });
    expect(data.format).toBe(EXPORT_FORMAT);
    expect(data.profile.homeRegion).toBe('kronoberg');
    expect(data.consent.analytics).toBe(true);
    // deterministic: collection sorted by species id
    expect(data.collection.map((r) => r.speciesId)).toEqual(['barn-swallow', 'pike']);
  });

  it('does not alias the input collection', () => {
    const data = buildDataExport({
      exportedAt: 't', profile: { homeRegion: null }, consent: DEFAULT_CONSENT, collection,
    });
    data.collection[0].spottedAt = 'mutated';
    expect(collection.find((r) => r.speciesId === 'barn-swallow')?.spottedAt).toBe('t');
  });

  it('serializes to valid JSON', () => {
    const data = buildDataExport({
      exportedAt: 't', profile: { homeRegion: null }, consent: DEFAULT_CONSENT, collection: [],
    });
    expect(JSON.parse(exportToJson(data))).toEqual(data);
  });
});
