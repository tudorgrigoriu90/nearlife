import { cellKey, DEFAULT_CELL_RESOLUTION_DEG } from './cell';

describe('cellKey', () => {
  const vaxjo = { latitude: 56.8777, longitude: 14.8091 };

  it('gives the same cell for two nearby points', () => {
    const a = cellKey(vaxjo);
    const b = cellKey({ latitude: 56.8779, longitude: 14.8095 }); // a few metres away
    expect(a).toBe(b);
  });

  it('gives different cells for distant points', () => {
    expect(cellKey(vaxjo)).not.toBe(cellKey({ latitude: 57.0, longitude: 15.0 }));
  });

  it('does not expose the precise coordinates (snaps to the grid)', () => {
    const key = cellKey(vaxjo, DEFAULT_CELL_RESOLUTION_DEG);
    expect(key).not.toContain('56.8777');
    expect(key).not.toContain('14.8091');
  });

  it('coarser resolution buckets more points together', () => {
    const coarse = 0.5;
    expect(cellKey(vaxjo, coarse)).toBe(cellKey({ latitude: 56.95, longitude: 14.95 }, coarse));
  });
});
