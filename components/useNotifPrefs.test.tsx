import { act, renderHook, waitFor } from '@testing-library/react-native';
import { DEFAULT_NOTIF_PREFS } from '../lib/notifPrefs';
import { useNotifPrefs } from './useNotifPrefs';

// T-342 · review F-03.
function gateway(stored = DEFAULT_NOTIF_PREFS) {
  return { load: jest.fn(async () => stored), save: jest.fn(async () => undefined) };
}

describe('useNotifPrefs', () => {
  it('reads the stored choices once notifications are on, and saves a change', async () => {
    const g = gateway({ ...DEFAULT_NOTIF_PREFS, frequency: 'weekly' });
    const { result } = await renderHook(() => useNotifPrefs(g, true));
    await waitFor(() => expect(result.current.prefs?.frequency).toBe('weekly'));
    await act(async () => result.current.change({ ...DEFAULT_NOTIF_PREFS, window: 'evening' }));
    expect(result.current.prefs?.window).toBe('evening');
    expect(g.save).toHaveBeenCalledWith({ ...DEFAULT_NOTIF_PREFS, window: 'evening' });
  });

  it('reads nothing while notifications are off, or without a backend', async () => {
    const g = gateway();
    const off = await renderHook(() => useNotifPrefs(g, false));
    expect(off.result.current.prefs).toBeNull();
    expect(g.load).not.toHaveBeenCalled();
    const none = await renderHook(() => useNotifPrefs(null, true));
    expect(none.result.current.prefs).toBeNull();
  });

  it('keeps the shown choice when the save fails', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const g = { load: jest.fn(async () => DEFAULT_NOTIF_PREFS), save: jest.fn(async () => Promise.reject(new Error('offline'))) };
    const { result } = await renderHook(() => useNotifPrefs(g, true));
    await waitFor(() => expect(result.current.prefs).not.toBeNull());
    await act(async () => result.current.change({ ...DEFAULT_NOTIF_PREFS, frequency: 'weekly' }));
    expect(result.current.prefs?.frequency).toBe('weekly');
  });
});
