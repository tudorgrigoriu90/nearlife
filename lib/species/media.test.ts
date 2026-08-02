import {
  assertAllowedLicense,
  attributionFor,
  isCommercialUseAllowed,
  KRONOBERG_MEDIA,
  primaryPhoto,
  type SpeciesMedia,
} from './media';
import { KRONOBERG_SPECIES } from './kronoberg';

function media(overrides: Partial<SpeciesMedia> & { speciesId: string }): SpeciesMedia {
  return {
    url: 'https://example.org/photo.jpg',
    license: 'CC-BY',
    author: 'A. Photographer',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Photo.jpg',
    isPrimary: true,
    ...overrides,
  };
}

describe('license rules', () => {
  it('allows CC0 / CC-BY / CC-BY-SA', () => {
    expect(isCommercialUseAllowed('CC0')).toBe(true);
    expect(isCommercialUseAllowed('CC-BY')).toBe(true);
    expect(isCommercialUseAllowed('CC-BY-SA')).toBe(true);
  });

  it('rejects NC / ND / unknown', () => {
    expect(isCommercialUseAllowed('CC-BY-NC')).toBe(false);
    expect(isCommercialUseAllowed('CC-BY-ND')).toBe(false);
    expect(isCommercialUseAllowed('All rights reserved')).toBe(false);
  });

  it('assertAllowedLicense throws on a disallowed license', () => {
    const bad = { ...media({ speciesId: 'swift' }), license: 'CC-BY-NC' as never };
    expect(() => assertAllowedLicense(bad)).toThrow(/disallowed/);
  });
});

describe('attributionFor', () => {
  it('formats an attribution line with author and license', () => {
    const line = attributionFor(media({ speciesId: 'swift', author: 'Jane Doe', license: 'CC0' }));
    expect(line).toContain('Jane Doe');
    expect(line).toContain('CC0');
  });
});

describe('primaryPhoto', () => {
  const list = [
    media({ speciesId: 'swift', isPrimary: false, url: 'a.jpg' }),
    media({ speciesId: 'swift', isPrimary: true, url: 'b.jpg' }),
    media({ speciesId: 'robin', isPrimary: true, url: 'c.jpg' }),
  ];

  it('returns the primary photo for a species', () => {
    expect(primaryPhoto(list, 'swift')?.url).toBe('b.jpg');
  });

  it('returns null when a species has no photo yet', () => {
    expect(primaryPhoto(list, 'osprey')).toBeNull();
  });
});

describe('KRONOBERG_MEDIA manifest', () => {
  it('contains only commercially-usable licenses (invariant #8)', () => {
    for (const m of KRONOBERG_MEDIA) {
      expect(isCommercialUseAllowed(m.license)).toBe(true);
    }
  });

  it('carries full attribution for every photo (author + source + url)', () => {
    for (const m of KRONOBERG_MEDIA) {
      expect(m.author.trim().length).toBeGreaterThan(0);
      expect(m.sourceUrl).toMatch(/^https?:\/\//);
      expect(m.url).toContain('/storage/v1/object/public/species-media/');
    }
  });

  it('maps every photo to a real curated species, with no duplicate primary', () => {
    const ids = new Set(KRONOBERG_SPECIES.map((s) => s.id));
    const primaries = new Set<string>();
    for (const m of KRONOBERG_MEDIA) {
      expect(ids.has(m.speciesId)).toBe(true);
      if (m.isPrimary) {
        expect(primaries.has(m.speciesId)).toBe(false);
        primaries.add(m.speciesId);
      }
    }
  });

  it('has a primary photo for every curated species (full coverage)', () => {
    for (const s of KRONOBERG_SPECIES) {
      expect(primaryPhoto(KRONOBERG_MEDIA, s.id)).not.toBeNull();
    }
  });
});
