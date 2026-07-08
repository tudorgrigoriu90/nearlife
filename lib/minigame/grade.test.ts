import { gradeFromScore, PERFECT_THRESHOLD } from './grade';

describe('gradeFromScore (shared minigame grade)', () => {
  it('grades a failed catch as a miss whatever the score', () => {
    expect(gradeFromScore(false, 0.99)).toBe('miss');
    expect(gradeFromScore(false, 0)).toBe('miss');
  });

  it('grades a high-scoring success as perfect', () => {
    expect(gradeFromScore(true, 0.95)).toBe('perfect');
  });

  it('treats the threshold as perfect (inclusive)', () => {
    expect(gradeFromScore(true, PERFECT_THRESHOLD)).toBe('perfect');
  });

  it('grades a modest success as good', () => {
    expect(gradeFromScore(true, 0.6)).toBe('good');
  });
});
