import { fireEvent, render, screen } from '@testing-library/react-native';
import NotifChoices from './NotifChoices';
import { createTranslator } from '../lib/i18n';
import { DEFAULT_NOTIF_PREFS } from '../lib/notifPrefs';

// T-342 · review F-03.
const tr = createTranslator('en');

describe('NotifChoices', () => {
  it('starts on today’s behaviour and reports each change', async () => {
    const onChange = jest.fn();
    await render(<NotifChoices locale="en" prefs={DEFAULT_NOTIF_PREFS} onChange={onChange} />);
    expect(screen.getByRole('button', { name: tr('notif.frequency.daily'), selected: true })).toBeTruthy();
    expect(screen.getByRole('button', { name: tr('notif.window.any'), selected: true })).toBeTruthy();
    await fireEvent.press(screen.getByText(tr('notif.frequency.weekly')));
    expect(onChange).toHaveBeenLastCalledWith({ ...DEFAULT_NOTIF_PREFS, frequency: 'weekly' });
    await fireEvent.press(screen.getByText(tr('notif.window.evening')));
    expect(onChange).toHaveBeenLastCalledWith({ ...DEFAULT_NOTIF_PREFS, window: 'evening' });
  });

  // T-390: the groups moved to Settings' "Show me", which applies to the whole app.
  it('has no group choice of its own', async () => {
    await render(<NotifChoices locale="en" prefs={DEFAULT_NOTIF_PREFS} onChange={jest.fn()} />);
    expect(screen.queryByText(tr('notif.group.plant'))).toBeNull();
    expect(screen.queryByText(tr('notif.groups'))).toBeNull();
  });

  it('names every option in Swedish too', async () => {
    await render(<NotifChoices locale="sv" prefs={DEFAULT_NOTIF_PREFS} onChange={jest.fn()} />);
    const sv = createTranslator('sv');
    expect(screen.getByText(sv('notif.frequency.everyOtherDay'))).toBeTruthy();
    expect(screen.getByText(sv('notif.window.midday'))).toBeTruthy();
  });
});
