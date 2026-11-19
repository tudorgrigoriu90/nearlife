import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { createTranslator } from '../../lib/i18n';
import TimingRingMinigame from './TimingRingMinigame';
import FishReelMinigame from './FishReelMinigame';
import TraceMinigame from './TraceMinigame';
import StealthMinigame from './StealthMinigame';
import FrameMinigame from './FrameMinigame';

// Drives each game's interaction/scoring path (interval ticks → evaluate → result → onComplete),
// which the render-only dispatcher test doesn't reach. Fake timers advance the setInterval loops.
const tr = createTranslator('en');

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

async function advance(ms: number) {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
}

async function continueOut(onComplete: jest.Mock) {
  await fireEvent.press(await screen.findByText(tr('minigame.continue')));
  expect(onComplete).toHaveBeenCalledTimes(1);
}

describe('minigame interaction → result', () => {
  it('bird timing: a tap resolves to a graded result', async () => {
    const onComplete = jest.fn();
    await render(<TimingRingMinigame onComplete={onComplete} />);
    await act(async () => {
      jest.advanceTimersByTime(300);
    });
    await fireEvent.press(screen.getByText('🐦')); // tap the diving bird → evaluateTiming
    await continueOut(onComplete);
  });

  it('bird timing: the give-up budget forces a miss result', async () => {
    const onComplete = jest.fn();
    await render(<TimingRingMinigame onComplete={onComplete} />);
    await advance(12000);
    await continueOut(onComplete);
  });

  it('fish rhythm: holding through the fight resolves a result', async () => {
    const onComplete = jest.fn();
    await render(<FishReelMinigame onComplete={onComplete} />);
    await advance(11000);
    await continueOut(onComplete);
  });

  it('insect trace: the trace window resolves a result', async () => {
    const onComplete = jest.fn();
    await render(<TraceMinigame onComplete={onComplete} />);
    // The clock starts at the first touch (T-277).
    await fireEvent(screen.getByTestId('trace-stage'), 'responderGrant', {
      nativeEvent: { locationX: 144, locationY: 144 },
    });
    await advance(10500);
    await continueOut(onComplete);
  });

  it('mammal stealth: the give-up budget resolves a result', async () => {
    const onComplete = jest.fn();
    await render(<StealthMinigame onComplete={onComplete} />);
    await advance(20000);
    await continueOut(onComplete);
  });

  it('plant frame: capturing resolves a result', async () => {
    const onComplete = jest.fn();
    await render(<FrameMinigame onComplete={onComplete} />);
    await fireEvent.press(await screen.findByText(tr('minigame.plant.capture')));
    await continueOut(onComplete);
  });
});

// T-331 · review I-25: easy mode has no give-up timer, so a slow player is never timed out.
describe('easy mode', () => {
  it('bird timing: waits for the tap however long it takes', async () => {
    const onComplete = jest.fn();
    await render(<TimingRingMinigame onComplete={onComplete} easy />);
    await advance(30000);
    expect(screen.queryByText(tr('minigame.continue'))).toBeNull();
    await fireEvent.press(screen.getByLabelText(tr('minigame.bird.hint')));
    await continueOut(onComplete);
  });

  it('mammal stealth: no give-up budget', async () => {
    await render(<StealthMinigame onComplete={jest.fn()} easy />);
    await advance(25000);
    expect(screen.queryByText(tr('minigame.continue'))).toBeNull();
  });

  it('mammal stealth: still times out without it', async () => {
    await render(<StealthMinigame onComplete={jest.fn()} />);
    await advance(25000);
    expect(await screen.findByText(tr('minigame.continue'))).toBeTruthy();
  });
});
