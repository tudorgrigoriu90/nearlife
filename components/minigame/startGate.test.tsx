import { act, fireEvent, render, screen } from '@testing-library/react-native';
import CatchMinigame from './CatchMinigame';
import TraceMinigame from './TraceMinigame';
import FrameMinigame from './FrameMinigame';
import { createTranslator } from '../../lib/i18n';

// T-277 · review B-60, B-62.
const tr = createTranslator('en');
beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

async function advance(ms: number) {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
}

describe('tap to start', () => {
  it('no game runs before the player taps start', async () => {
    const onComplete = jest.fn();
    await render(<CatchMinigame category="insect" locale="en" onComplete={onComplete} />);
    expect(screen.getByText(tr('minigame.insect.instruction'))).toBeTruthy();
    await advance(20_000); // reading the instruction costs nothing
    expect(screen.queryByText(tr('minigame.continue'))).toBeNull();
    await fireEvent.press(screen.getByText(tr('minigame.tapToStart')));
    expect(screen.queryByText(tr('minigame.tapToStart'))).toBeNull();
  });
});

describe('the insect trace starts on the first touch', () => {
  it('records nothing until the finger is on the stage', async () => {
    const onComplete = jest.fn();
    await render(<TraceMinigame onComplete={onComplete} />);
    await advance(15_000);
    expect(screen.queryByText(tr('minigame.continue'))).toBeNull(); // no time has run
    const stage = screen.getByTestId('trace-stage');
    await fireEvent(stage, 'responderGrant', { nativeEvent: { locationX: 144, locationY: 144 } });
    await advance(10_500);
    expect(screen.getByText(tr('minigame.continue'))).toBeTruthy();
  });
});

describe('touch positions are relative to the stage (B-62)', () => {
  it.each([
    ['trace-stage', () => <TraceMinigame onComplete={() => {}} />],
    ['frame-stage', () => <FrameMinigame onComplete={() => {}} />],
  ])('every child of %s ignores touches', async (testID, make) => {
    await render(make());
    const stage = screen.getByTestId(testID);
    expect(stage.children.length).toBeGreaterThan(0);
    for (const child of stage.children) {
      if (typeof child === 'string') continue;
      expect(child.props.pointerEvents).toBe('none');
    }
  });
});
