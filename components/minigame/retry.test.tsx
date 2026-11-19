import { fireEvent, render, screen } from '@testing-library/react-native';
import { createTranslator } from '../../lib/i18n';
import CatchMinigame from './CatchMinigame';
import MinigameShell from './MinigameShell';
import type { MinigameProps } from './types';

// T-311 · review B-45: a miss can be retried on the spot; a free catch is spent only on success.

let mounts = 0;
jest.mock('./TimingRingMinigame', () => ({
  __esModule: true,
  default: (props: MinigameProps) => {
    const { useEffect } = require('react');
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(() => {
      mounts += 1;
    }, []);
    const Shell = require('./MinigameShell').default;
    return (
      <Shell
        instruction="x"
        result={{ success: false, score: 0.1 }}
        onComplete={() => props.onComplete({ success: false, score: 0.1 })}
        onRetry={props.onRetry}
      >
        {null}
      </Shell>
    );
  },
}));

const tr = createTranslator('en');

describe('Try again after a miss', () => {
  it('restarts the same game without leaving it', async () => {
    mounts = 0;
    const onComplete = jest.fn();
    await render(<CatchMinigame category="bird" onComplete={onComplete} />);
    await fireEvent.press(screen.getByText(tr('minigame.tapToStart')));
    expect(mounts).toBe(1);
    await fireEvent.press(screen.getByText(tr('minigame.retry')));
    expect(mounts).toBe(2); // a fresh round, straight in: no "Tap to start", no catch-spot screen
    expect(screen.queryByText(tr('minigame.tapToStart'))).toBeNull();
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('"Back" after a miss reports the miss', async () => {
    const onComplete = jest.fn();
    await render(<CatchMinigame category="bird" onComplete={onComplete} />);
    await fireEvent.press(screen.getByText(tr('minigame.tapToStart')));
    await fireEvent.press(screen.getByText(tr('minigame.back')));
    expect(onComplete).toHaveBeenCalledWith({ success: false, score: 0.1 });
  });
});

describe('MinigameShell result', () => {
  it('a win offers only Continue', async () => {
    await render(
      <MinigameShell instruction="x" result={{ success: true, score: 1 }} onComplete={() => {}} onRetry={() => {}}>
        {null}
      </MinigameShell>,
    );
    expect(screen.getByText(tr('minigame.continue'))).toBeTruthy();
    expect(screen.queryByText(tr('minigame.retry'))).toBeNull();
  });
});
