import { FIRST_STEP, ONBOARDING_STEPS, isComplete, stepAfter, stepOnBack } from './onboarding';

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
      'ageGate',
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

describe('stepOnBack (T-233)', () => {
  it('steps back one screen through the flow', () => {
    expect(stepOnBack('ageGate')).toBe('welcome');
    expect(stepOnBack('locationPrePrompt')).toBe('ageGate');
    expect(stepOnBack('hometownConfirm')).toBe('locationPrePrompt');
    expect(stepOnBack('notificationPrePrompt')).toBe('hometownConfirm');
  });

  it('closes the first sighting card the way its own button does', () => {
    // The sighting is already recorded; back leaves the card for the app, never to an ask again.
    expect(stepOnBack('firstSpotted')).toBe('done');
  });

  it('lets Android leave the app only from the welcome screen', () => {
    expect(stepOnBack('welcome')).toBeNull();
    expect(stepOnBack('done')).toBeNull();
  });
});
