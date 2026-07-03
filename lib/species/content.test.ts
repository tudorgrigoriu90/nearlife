import { KRONOBERG_SPECIES } from './kronoberg';
import { FOLLOW_LOCAL_LAW, KRONOBERG_CONTENT } from './content';

// Phrases that would break the honesty rule (GDD §3): never claim real-time presence.
const FORBIDDEN_PHRASES = ['right now', 'here now', 'currently here', 'near you now'];

describe('Kronoberg species content', () => {
  it('has content for every species in the list', () => {
    for (const s of KRONOBERG_SPECIES) {
      expect(KRONOBERG_CONTENT[s.id]).toBeDefined();
    }
  });

  it('has no orphan content without a matching species', () => {
    const validIds = new Set(KRONOBERG_SPECIES.map((s) => s.id));
    for (const id of Object.keys(KRONOBERG_CONTENT)) {
      expect(validIds.has(id)).toBe(true);
    }
  });

  it('has all four always-free fields, non-empty, with speciesId matching the key', () => {
    for (const [id, c] of Object.entries(KRONOBERG_CONTENT)) {
      expect(c.speciesId).toBe(id);
      for (const field of [c.fact, c.whenAndHow, c.give, c.protect]) {
        expect(field.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('obeys the honesty rule — no real-time presence claims anywhere', () => {
    for (const c of Object.values(KRONOBERG_CONTENT)) {
      const blob = `${c.fact} ${c.whenAndHow} ${c.give} ${c.protect}`.toLowerCase();
      for (const phrase of FORBIDDEN_PHRASES) {
        expect(blob).not.toContain(phrase);
      }
    }
  });

  it('never recommends planting or releasing a specific species (invasive-risk rule)', () => {
    // Give actions must stay universally safe: no "plant <thing>" / "release <thing>".
    for (const c of Object.values(KRONOBERG_CONTENT)) {
      const give = c.give.toLowerCase();
      expect(give).not.toMatch(/\bplant \w/);
      expect(give).not.toMatch(/\brelease \w/);
    }
  });

  it('provides a standing follow-local-law line for help cards', () => {
    expect(FOLLOW_LOCAL_LAW.toLowerCase()).toContain('local');
    expect(FOLLOW_LOCAL_LAW.trim().length).toBeGreaterThan(0);
  });
});
