import { DEFAULT_TRACE, evaluateTrace } from './trace';

describe('evaluateTrace (insect)', () => {
  it('succeeds when the finger stayed on the path', () => {
    const r = evaluateTrace([2, 5, 10, 3, 8]);
    expect(r.breaks).toBe(0);
    expect(r.success).toBe(true);
  });

  it('counts breaks past tolerance and forgives up to the allowance', () => {
    const distances = [5, 40, 50, 5]; // two breaks with default tolerance 28
    const r = evaluateTrace(distances);
    expect(r.breaks).toBe(2);
    expect(r.success).toBe(true); // within allowedBreaks (6)
  });

  it('fails once breaks exceed the allowance', () => {
    const distances = Array(8).fill(100); // 8 breaks > allowedBreaks 6
    expect(evaluateTrace(distances).success).toBe(false);
  });

  it('an empty trace is not a success', () => {
    expect(evaluateTrace([]).success).toBe(false);
  });

  it('respects a stricter config', () => {
    expect(evaluateTrace([30], { tolerancePx: 20, allowedBreaks: 0 }).success).toBe(false);
    expect(evaluateTrace([10], DEFAULT_TRACE).success).toBe(true);
  });
});
