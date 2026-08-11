import { cellToLatLng, isValidCell } from 'h3-js';
import { cellKey, cellResolution, DEFAULT_CELL_RESOLUTION } from './cell';

describe('cellKey (H3)', () => {
  const vaxjo = { latitude: 56.8777, longitude: 14.8091 };

  it('returns a valid H3 cell at the default resolution', () => {
    const key = cellKey(vaxjo);
    expect(isValidCell(key)).toBe(true);
    expect(cellResolution(key)).toBe(DEFAULT_CELL_RESOLUTION);
  });

  it('reduces a point to its containing cell — the precise position is discarded', () => {
    // The cell centre is, by definition, inside the cell, so it must map back to the same key.
    // (Two arbitrary "nearby" points can straddle a cell edge, so this is the deterministic form
    // of "close positions collapse to one key".)
    const key = cellKey(vaxjo);
    const [lat, lng] = cellToLatLng(key);
    expect(cellKey({ latitude: lat, longitude: lng })).toBe(key);
  });

  it('gives different cells for distant points', () => {
    expect(cellKey(vaxjo)).not.toBe(cellKey({ latitude: 57.0, longitude: 15.0 }));
  });

  it('does not expose the precise coordinates (opaque H3 index)', () => {
    const key = cellKey(vaxjo);
    expect(key).not.toContain('56.8777');
    expect(key).not.toContain('14.8091');
  });

  it('coarser resolution buckets more points together', () => {
    const coarse = 3; // ~59 km hex edge — points ~10 km apart share a cell
    expect(cellKey(vaxjo, coarse)).toBe(cellKey({ latitude: 56.95, longitude: 14.95 }, coarse));
    expect(cellResolution(cellKey(vaxjo, coarse))).toBe(coarse);
  });
});
