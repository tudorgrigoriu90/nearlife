import { act, renderHook, waitFor } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';
import { InMemoryEasyModeStore } from '../lib/easyModeStore';
import { useEasyMode } from './useEasyMode';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

describe('useEasyMode (T-331)', () => {
  let listener: ((on: boolean) => void) | null = null;
  beforeEach(() => {
    listener = null;
    jest.spyOn(AccessibilityInfo, 'addEventListener').mockImplementation(((_: string, fn: (on: boolean) => void) => {
      listener = fn;
      return { remove: jest.fn() };
    }) as never);
  });
  afterEach(() => jest.restoreAllMocks());

  it('starts in easy mode when the phone asks for reduced motion', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    const { result } = await renderHook(() => useEasyMode(new InMemoryEasyModeStore()));
    await waitFor(() => expect(result.current.easy).toBe(true));
  });

  it('follows the setting when it changes', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
    const { result } = await renderHook(() => useEasyMode(new InMemoryEasyModeStore()));
    await waitFor(() => expect(listener).not.toBeNull());
    await act(async () => listener!(true));
    expect(result.current.easy).toBe(true);
  });

  it('the person’s own choice wins, and is saved', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    const store = new InMemoryEasyModeStore();
    const { result } = await renderHook(() => useEasyMode(store));
    await waitFor(() => expect(result.current.easy).toBe(true));
    await act(async () => result.current.setEasy(false));
    expect(result.current.easy).toBe(false);
    expect(await store.load()).toBe(false);
  });

  it('loads an earlier choice', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
    const { result } = await renderHook(() => useEasyMode(new InMemoryEasyModeStore(true)));
    await waitFor(() => expect(result.current.easy).toBe(true));
  });
});
