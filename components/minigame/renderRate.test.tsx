import { Profiler } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import TimingRingMinigame from './TimingRingMinigame';
import FishReelMinigame from './FishReelMinigame';
import TraceMinigame from './TraceMinigame';
import StealthMinigame from './StealthMinigame';
import { createTranslator } from '../../lib/i18n';

// T-366 · review I-06: motion runs on the native thread or through Animated values, so React
// re-renders a game at most every 200 ms while it plays (it used to re-render every 30-60 ms,
// which stutters on low-end Android).
const tr = createTranslator('en');

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

const PLAY_MS = 4000;
const MAX_RENDERS = PLAY_MS / 200 + 3; // the first render, plus a little slack

async function rendersWhilePlaying(element: React.ReactElement, start?: () => Promise<void>): Promise<number> {
  let commits = 0;
  await render(
    <Profiler id="game" onRender={() => (commits += 1)}>
      {element}
    </Profiler>,
  );
  if (start) await start();
  commits = 0;
  // One act per 20 ms step: inside a single act React would batch every tick into one commit.
  for (let t = 0; t < PLAY_MS; t += 20) {
    await act(async () => {
      jest.advanceTimersByTime(20);
    });
  }
  return commits;
}

describe('minigames do not re-render on every animation tick', () => {
  it('bird timing', async () => {
    expect(await rendersWhilePlaying(<TimingRingMinigame onComplete={jest.fn()} />)).toBeLessThanOrEqual(MAX_RENDERS);
  });

  it('fish reel, while the player holds', async () => {
    const n = await rendersWhilePlaying(<FishReelMinigame onComplete={jest.fn()} />, async () => {
      await fireEvent(screen.getByLabelText(tr('minigame.fish.hint')), 'pressIn');
    });
    expect(n).toBeLessThanOrEqual(MAX_RENDERS);
  });

  it('insect trace, with a finger on the stage', async () => {
    const n = await rendersWhilePlaying(<TraceMinigame onComplete={jest.fn()} />, async () => {
      await fireEvent(screen.getByTestId('trace-stage'), 'responderGrant', { nativeEvent: { locationX: 144, locationY: 144 } });
    });
    expect(n).toBeLessThanOrEqual(MAX_RENDERS);
  });

  it('mammal stealth, while the player creeps', async () => {
    const n = await rendersWhilePlaying(<StealthMinigame onComplete={jest.fn()} easy />, async () => {
      await fireEvent(screen.getByText(tr('minigame.mammal.holdToCreep')), 'pressIn');
    });
    expect(n).toBeLessThanOrEqual(MAX_RENDERS);
  });
});
