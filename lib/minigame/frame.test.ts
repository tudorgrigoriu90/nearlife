import { catchSeed, DEFAULT_FRAME, evaluateFrame, frameLayout } from './frame';

describe('evaluateFrame (plant/fungus)', () => {
  it('is perfect at dead-centre', () => {
    const r = evaluateFrame(0, 100);
    expect(r.accuracy).toBe(1);
    expect(r.success).toBe(true);
  });

  it('falls off linearly toward the edge', () => {
    expect(evaluateFrame(50, 100).accuracy).toBeCloseTo(0.5);
    expect(evaluateFrame(75, 100).accuracy).toBeCloseTo(0.25);
  });

  it('lands it at the threshold and misses beyond it', () => {
    expect(evaluateFrame(50, 100, DEFAULT_FRAME).success).toBe(true); // 0.5
    expect(evaluateFrame(60, 100, DEFAULT_FRAME).success).toBe(false); // 0.4
  });

  it('clamps distances beyond the radius to zero accuracy', () => {
    const r = evaluateFrame(200, 100);
    expect(r.accuracy).toBe(0);
    expect(r.success).toBe(false);
  });
});

// T-321 · review B-61: the plant game's subject is not always in the same place.
describe('frameLayout', () => {
  it('the same seed gives the same layout', () => {
    expect(frameLayout(42, 288)).toEqual(frameLayout(42, 288));
  });

  it('different seeds place the subject differently', () => {
    const spots = new Set(
      Array.from({ length: 12 }, (_, i) => JSON.stringify(frameLayout(i * 7919 + 1, 288).subject)),
    );
    expect(spots.size).toBeGreaterThan(1);
  });

  it('always one subject among three decoys, all on the stage, none on top of another', () => {
    for (let seed = 1; seed < 50; seed++) {
      const { subject, decoys } = frameLayout(seed, 288);
      expect(decoys).toHaveLength(3);
      const all = [subject, ...decoys];
      for (const p of all) {
        expect(p.x).toBeGreaterThan(0);
        expect(p.x).toBeLessThan(288);
        expect(p.y).toBeGreaterThan(0);
        expect(p.y).toBeLessThan(288);
      }
      expect(new Set(all.map((p) => `${p.x},${p.y}`)).size).toBe(4);
    }
  });
});

describe('catchSeed', () => {
  it('depends on the species and the day', () => {
    expect(catchSeed('gbif:1', '2026-11-19')).toBe(catchSeed('gbif:1', '2026-11-19'));
    expect(catchSeed('gbif:1', '2026-11-19')).not.toBe(catchSeed('gbif:2', '2026-11-19'));
    expect(catchSeed('gbif:1', '2026-11-19')).not.toBe(catchSeed('gbif:1', '2026-11-20'));
  });
});
