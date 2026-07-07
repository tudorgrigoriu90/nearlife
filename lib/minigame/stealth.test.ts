import { evaluateStealth, type StealthTick } from './stealth';

const move = (alert: boolean): StealthTick => ({ moving: true, alert });
const freeze = (alert: boolean): StealthTick => ({ moving: false, alert });

describe('evaluateStealth (mammal)', () => {
  it('succeeds when enough safe advances are made without being spotted', () => {
    const ticks = [...Array(12)].map(() => move(false));
    const r = evaluateStealth(ticks);
    expect(r.progress).toBe(12);
    expect(r.spotted).toBe(false);
    expect(r.success).toBe(true);
  });

  it('gets spotted when moving while the animal is alert', () => {
    const ticks = [move(false), move(false), move(true), move(false)];
    const r = evaluateStealth(ticks);
    expect(r.spotted).toBe(true);
    expect(r.success).toBe(false);
    expect(r.progress).toBe(2); // stops at the moment of being spotted
  });

  it('freezing while alert is safe (no progress, no spot)', () => {
    const ticks = [move(false), freeze(true), freeze(true), move(false)];
    const r = evaluateStealth(ticks);
    expect(r.spotted).toBe(false);
    expect(r.progress).toBe(2);
  });

  it('fails if it never closes the distance', () => {
    expect(evaluateStealth([move(false)], { progressNeeded: 12 }).success).toBe(false);
  });
});
