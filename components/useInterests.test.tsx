import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { Interests } from '../lib/interests';
import type { InterestsStore } from '../lib/interestsStore';
import { DEFAULT_NOTIF_PREFS, type NotifPrefs } from '../lib/notifPrefs';
import { useInterests } from './useInterests';

// T-390: "Show me" is the phone's choice; the notification groups follow it.
function store(initial: { interests: Interests; stored: boolean }) {
  const saved: Interests[] = [];
  const s: InterestsStore = { load: async () => initial, save: async (i) => void saved.push(i) };
  return { s, saved };
}

describe('useInterests', () => {
  it('loads the choice, and a change is saved and sent to the notification groups', async () => {
    const { s, saved } = store({ interests: ['bird'], stored: true });
    const change = jest.fn();
    const prefs: NotifPrefs = { ...DEFAULT_NOTIF_PREFS, groups: ['bird'] };
    const { result } = await renderHook(() => useInterests(s, { prefs, change }));
    await waitFor(() => expect(result.current.interests).toEqual(['bird']));
    await act(async () => result.current.change(['bird', 'fish']));
    expect(result.current.interests).toEqual(['bird', 'fish']);
    expect(saved).toEqual([['bird', 'fish']]);
    expect(change).toHaveBeenLastCalledWith({ ...prefs, groups: ['bird', 'fish'] });
  });

  it('brings the notification groups in line with the phone once they are read', async () => {
    const { s } = store({ interests: ['plant'], stored: true });
    const change = jest.fn();
    const prefs: NotifPrefs = { ...DEFAULT_NOTIF_PREFS, frequency: 'weekly' };
    await renderHook(() => useInterests(s, { prefs, change }));
    await waitFor(() => expect(change).toHaveBeenCalledWith({ ...prefs, groups: ['plant'] }));
  });

  it('adopts the groups chosen for notifications before "Show me" existed, once', async () => {
    const { s, saved } = store({ interests: null, stored: false });
    const change = jest.fn();
    const prefs: NotifPrefs = { ...DEFAULT_NOTIF_PREFS, groups: ['mammal'] };
    const { result } = await renderHook(() => useInterests(s, { prefs, change }));
    await waitFor(() => expect(result.current.interests).toEqual(['mammal']));
    expect(saved).toEqual([['mammal']]);
    expect(change).not.toHaveBeenCalled();
  });

  it('works without notifications', async () => {
    const { s, saved } = store({ interests: null, stored: false });
    const { result } = await renderHook(() => useInterests(s, { prefs: null, change: jest.fn() }));
    await act(async () => result.current.change(['insect']));
    expect(result.current.interests).toEqual(['insect']);
    expect(saved).toEqual([['insect']]);
  });
});
