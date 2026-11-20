import { sampledPath } from './motion';

// T-366 · review I-06: a time-based path, sampled for a native-driver interpolation.
describe('sampledPath', () => {
  it('samples the path every step, ending exactly at the duration', () => {
    const p = sampledPath((ms) => ms * 2, 250, 100);
    expect(p.inputRange).toEqual([0, 100, 200, 250]);
    expect(p.outputRange).toEqual([0, 200, 400, 500]);
  });

  it('stays within a pixel of a smooth path between samples', () => {
    const f = (ms: number) => 100 * Math.sin(ms / 1000);
    const p = sampledPath(f, 10000, 50);
    for (let ms = 0; ms <= 10000; ms += 7) {
      const i = Math.min(p.inputRange.length - 2, Math.floor(ms / 50));
      const [a, b] = [p.inputRange[i], p.inputRange[i + 1]];
      const lerp = p.outputRange[i] + ((p.outputRange[i + 1] - p.outputRange[i]) * (ms - a)) / (b - a);
      expect(Math.abs(lerp - f(ms))).toBeLessThan(1);
    }
  });
});
