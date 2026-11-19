import { DEFAULT_FRAME, EASY_FRAME, evaluateFrame } from './frame';
import { DEFAULT_RHYTHM, EASY_RHYTHM, evaluateRhythm } from './rhythm';
import { DEFAULT_STEALTH, EASY_STEALTH } from './stealth';
import { DEFAULT_TIMING, EASY_TIMING, evaluateTiming } from './timing';
import { DEFAULT_TRACE, EASY_TRACE } from './trace';

// T-331 · review I-25: easy mode is at least twice as forgiving in every game, so a catch never
// hangs on fine motor timing.

describe('easy configs', () => {
  it('double the timing windows', () => {
    expect(EASY_TIMING.perfectWindowMs).toBeGreaterThanOrEqual(2 * DEFAULT_TIMING.perfectWindowMs);
    expect(EASY_TIMING.goodWindowMs).toBeGreaterThanOrEqual(2 * DEFAULT_TIMING.goodWindowMs);
    // A tap 500 ms off misses normally and lands in easy mode.
    expect(evaluateTiming(1500, 2000).success).toBe(false);
    expect(evaluateTiming(1500, 2000, EASY_TIMING).success).toBe(true);
  });

  it('halve what the fish fight needs', () => {
    expect(EASY_RHYTHM.successRatio).toBeLessThanOrEqual(DEFAULT_RHYTHM.successRatio / 2);
    expect(evaluateRhythm(4, 10).success).toBe(false);
    expect(evaluateRhythm(4, 10, EASY_RHYTHM).success).toBe(true);
  });

  it('double the trace tolerance and forgiven breaks', () => {
    expect(EASY_TRACE.tolerancePx).toBeGreaterThanOrEqual(2 * DEFAULT_TRACE.tolerancePx);
    expect(EASY_TRACE.allowedBreaks).toBeGreaterThanOrEqual(2 * DEFAULT_TRACE.allowedBreaks);
  });

  it('halve the stealth distance and the framing accuracy', () => {
    expect(EASY_STEALTH.progressNeeded).toBeLessThanOrEqual(DEFAULT_STEALTH.progressNeeded / 2);
    expect(EASY_FRAME.successThreshold).toBeLessThanOrEqual(DEFAULT_FRAME.successThreshold / 2);
    expect(evaluateFrame(60, 84).success).toBe(false);
    expect(evaluateFrame(60, 84, EASY_FRAME).success).toBe(true);
  });
});
