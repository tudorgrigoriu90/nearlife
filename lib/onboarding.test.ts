import { FIRST_STEP, ONBOARDING_STEPS, isComplete, stepAfter } from './onboarding';

describe('onboarding flow', () => {
  it('starts at welcome and ends at done', () => {
    expect(FIRST_STEP).toBe('welcome');
    expect(ONBOARDING_STEPS[ONBOARDING_STEPS.length - 1]).toBe('done');
  });

  it('advances through the sequence in order', () => {
    const visited: string[] = [];
    let step = FIRST_STEP;
    for (let i = 0; i < 10 && !isComplete(step); i++) {
      visited.push(step);
      step = stepAfter(step);
    }
    expect(visited).toEqual([
      'welcome',
      'locationPrePrompt',
      'hometownConfirm',
      'notificationPrePrompt',
      'firstSpotted',
    ]);
    expect(isComplete(step)).toBe(true);
  });

  it('clamps at done (terminal step never overflows)', () => {
    expect(stepAfter('done')).toBe('done');
    expect(isComplete('done')).toBe(true);
    expect(isComplete('welcome')).toBe(false);
  });
});
