import { DEFAULT_TRACE, evaluateTrace } from './trace';

describe('evaluateTrace (insect)', () => {
  it('succeeds when the finger stayed on the path', () => {
    const r = evaluateTrace([2, 5, 10, 3, 8]);
    expect(r.breaks).toBe(0);
    expect(r.success).toBe(true);
  });

  it('counts breaks past tolerance and forgives up to the allowance', () => {
    const distances = [5, 50, 60, 5]; // two breaks with default tolerance 44
    const r = evaluateTrace(distances);
    expect(r.breaks).toBe(2);
    expect(r.success).toBe(true); // within allowedBreaks (25)
  });

  it('fails once breaks exceed the allowance', () => {
    const distances = Array(26).fill(100); // 26 breaks > allowedBreaks 25
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

// T-277 · review B-60: at 28 px and 6 breaks a first-time player could not win (6 × 60 ms is
// 0.36 s of slack in 10 s). Starting point from the review, to be confirmed on a phone.
describe('the trace defaults', () => {
  it('forgive a fingertip-sized miss and 15% of the samples', () => {
    expect(DEFAULT_TRACE).toEqual({ tolerancePx: 44, allowedBreaks: 25 });
    const samples = 166; // 10 s at 60 ms
    expect(DEFAULT_TRACE.allowedBreaks / samples).toBeCloseTo(0.15, 2);
  });
});
