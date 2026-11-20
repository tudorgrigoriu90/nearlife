import { Text } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import MinigameShell from './MinigameShell';
import { createTranslator } from '../../lib/i18n';

const tr = createTranslator('en');

describe('MinigameShell', () => {
  it('shows the stage + instruction while playing and cancels', async () => {
    const onCancel = jest.fn();
    await render(
      <MinigameShell locale="en" instruction="Tap it" result={null} onComplete={() => {}} onCancel={onCancel}>
        <Text>stage</Text>
      </MinigameShell>,
    );
    expect(screen.getByText('Tap it')).toBeTruthy();
    expect(screen.getByText('stage')).toBeTruthy();
    fireEvent.press(screen.getByText(tr('minigame.cancel')));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('shows the win result (perfect) and continues', async () => {
    const onComplete = jest.fn();
    await render(
      <MinigameShell locale="en" instruction="x" result={{ success: true, score: 1 }} onComplete={onComplete}>
        <Text>stage</Text>
      </MinigameShell>,
    );
    expect(screen.getByText(tr('minigame.success'))).toBeTruthy();
    expect(screen.getByText(tr('minigame.grade.perfect'))).toBeTruthy();
    fireEvent.press(screen.getByText(tr('minigame.continue')));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('shows the lose result (miss) on a failed catch', async () => {
    await render(
      <MinigameShell locale="en" instruction="x" result={{ success: false, score: 0 }} onComplete={() => {}}>
        <Text>stage</Text>
      </MinigameShell>,
    );
    expect(screen.getByText(tr('minigame.fail'))).toBeTruthy();
    expect(screen.getByText(tr('minigame.grade.miss'))).toBeTruthy();
  });
});

// T-366 · review I-06: a short vibration on the result, once.
describe('MinigameShell haptics', () => {
  const vibrate = Haptics.notificationAsync as jest.Mock;
  beforeEach(() => vibrate.mockClear());

  it('vibrates "success" on a catch and "error" on a miss, once each, and not while playing', async () => {
    const { rerender } = await render(
      <MinigameShell locale="en" instruction="x" result={null} onComplete={() => {}}>
        <Text>stage</Text>
      </MinigameShell>,
    );
    expect(vibrate).not.toHaveBeenCalled();
    await rerender(
      <MinigameShell locale="en" instruction="x" result={{ success: true, score: 1 }} onComplete={() => {}}>
        <Text>stage</Text>
      </MinigameShell>,
    );
    await rerender(
      <MinigameShell locale="en" instruction="x" result={{ success: true, score: 1 }} onComplete={() => {}}>
        <Text>stage</Text>
      </MinigameShell>,
    );
    expect(vibrate).toHaveBeenCalledTimes(1);
    expect(vibrate).toHaveBeenLastCalledWith(Haptics.NotificationFeedbackType.Success);

    vibrate.mockClear();
    await render(
      <MinigameShell locale="en" instruction="x" result={{ success: false, score: 0.2 }} onComplete={() => {}}>
        <Text>stage</Text>
      </MinigameShell>,
    );
    expect(vibrate).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Error);
  });
});
