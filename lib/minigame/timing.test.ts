import { DEFAULT_TIMING, evaluateTiming } from './timing';

describe('evaluateTiming', () => {
  it('grades an exact tap as perfect', () => {
    const r = evaluateTiming(1000, 1000);
    expect(r.grade).toBe('perfect');
    expect(r.success).toBe(true);
    expect(r.offsetMs).toBe(0);
  });

  it('treats early and late taps symmetrically', () => {
    const early = evaluateTiming(1000, 1000 - 200);
    const late = evaluateTiming(1000, 1000 + 200);
    expect(early.grade).toBe('good');
    expect(late.grade).toBe('good');
    expect(early.offsetMs).toBe(late.offsetMs);
  });

  it('misses when beyond the good window', () => {
    const r = evaluateTiming(1000, 1000 + DEFAULT_TIMING.goodWindowMs + 1);
    expect(r.grade).toBe('miss');
    expect(r.success).toBe(false);
  });

  it('treats window boundaries as inclusive', () => {
    expect(evaluateTiming(0, DEFAULT_TIMING.perfectWindowMs).grade).toBe('perfect');
    expect(evaluateTiming(0, DEFAULT_TIMING.goodWindowMs).grade).toBe('good');
  });

  it('honours a custom config', () => {
    const strict = { perfectWindowMs: 10, goodWindowMs: 20 };
    expect(evaluateTiming(0, 15, strict).grade).toBe('good');
    expect(evaluateTiming(0, 25, strict).grade).toBe('miss');
  });
});
