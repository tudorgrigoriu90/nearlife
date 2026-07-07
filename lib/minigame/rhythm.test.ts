import { DEFAULT_RHYTHM, evaluateRhythm } from './rhythm';

describe('evaluateRhythm (fish)', () => {
  it('lands the catch when the line was held in-zone enough', () => {
    const r = evaluateRhythm(7, 10);
    expect(r.ratio).toBeCloseTo(0.7);
    expect(r.success).toBe(true);
  });

  it('fails when the line spent too long out of the zone', () => {
    expect(evaluateRhythm(3, 10).success).toBe(false);
  });

  it('lands exactly at the threshold (inclusive)', () => {
    expect(evaluateRhythm(6, 10, DEFAULT_RHYTHM).success).toBe(true); // 0.6
  });

  it('an empty fight is never a success', () => {
    const r = evaluateRhythm(0, 0);
    expect(r.ratio).toBe(0);
    expect(r.success).toBe(false);
  });

  it('honours a custom success ratio', () => {
    expect(evaluateRhythm(5, 10, { successRatio: 0.4 }).success).toBe(true);
  });
});
