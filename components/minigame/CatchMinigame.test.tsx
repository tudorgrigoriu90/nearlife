import { fireEvent, render, screen } from '@testing-library/react-native';
import CatchMinigame from './CatchMinigame';
import { createTranslator } from '../../lib/i18n';
import type { SpeciesCategory } from '../../lib/species/types';

const tr = createTranslator('en');

// Fake timers so the games' setInterval loops don't tick during the test (no act noise); we only
// assert the initial render (per-category dispatch) and the cancel path.
beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

const CASES: { category: SpeciesCategory; instruction: string }[] = [
  { category: 'bird', instruction: 'minigame.bird.instruction' },
  { category: 'fish', instruction: 'minigame.fish.instruction' },
  { category: 'insect', instruction: 'minigame.insect.instruction' },
  { category: 'mammal', instruction: 'minigame.mammal.instruction' },
  { category: 'plant', instruction: 'minigame.plant.instruction' },
  { category: 'fungus', instruction: 'minigame.plant.instruction' }, // fungus reskins plant
];

describe('CatchMinigame dispatcher', () => {
  it.each(CASES)('renders the $category mechanic and cancels', async ({ category, instruction }) => {
    const onCancel = jest.fn();
    await render(<CatchMinigame category={category} locale="en" onComplete={() => {}} onCancel={onCancel} />);
    expect(screen.getByText(tr(instruction as Parameters<typeof tr>[0]))).toBeTruthy();
    fireEvent.press(screen.getByText(tr('minigame.cancel')));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});

// T-367 · review I-12: the emulator build (and only it) can win a game outright, so the end-to-end
// flows can test the whole catch path; a timing game cannot be played reliably by a script.
describe('test-build win switch', () => {
  it('in an end-to-end build, "win" completes the catch with a full score', async () => {
    const onComplete = jest.fn();
    await render(<CatchMinigame category="bird" locale="en" onComplete={onComplete} e2eWin />);
    await fireEvent.press(screen.getByText(tr('minigame.tapToStart')));
    await fireEvent.press(screen.getByTestId('e2e-win'));
    expect(onComplete).toHaveBeenCalledWith({ success: true, score: 1 });
  });

  it('is absent from a normal build', async () => {
    await render(<CatchMinigame category="bird" locale="en" onComplete={() => {}} />);
    await fireEvent.press(screen.getByText(tr('minigame.tapToStart')));
    expect(screen.queryByTestId('e2e-win')).toBeNull();
  });
});
