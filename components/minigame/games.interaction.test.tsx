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
    await advance(10000);
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
