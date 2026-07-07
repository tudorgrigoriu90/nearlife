import { DEFAULT_FRAME, evaluateFrame } from './frame';

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
