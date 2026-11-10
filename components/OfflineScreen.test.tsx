import { act, fireEvent, render, renderHook, screen } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';
import OfflineScreen from './OfflineScreen';
import { RECHECK_MS, useConnectivity } from './useConnectivity';
import { createTranslator } from '../lib/i18n';

const tr = createTranslator('sv');
const flush = () => act(async () => undefined);

// T-252: offline, say so before showing lists with empty cards.
describe('OfflineScreen', () => {
  it('says the app needs the internet, with retry and continue', async () => {
    const onRetry = jest.fn();
    const onContinue = jest.fn();
    await render(
      <OfflineScreen locale="sv" checking={false} onRetry={onRetry} onContinue={onContinue} />,
    );
    expect(screen.getByText(tr('offline.title'))).toBeTruthy();
    expect(screen.getByText(tr('offline.body'))).toBeTruthy();
    await fireEvent.press(screen.getByText(tr('offline.retry')));
    expect(onRetry).toHaveBeenCalled();
    await fireEvent.press(screen.getByText(tr('offline.continue')));
    expect(onContinue).toHaveBeenCalled();
  });

  it('shows that it is checking', async () => {
    await render(<OfflineScreen locale="sv" checking onRetry={jest.fn()} onContinue={jest.fn()} />);
    expect(screen.getByText(tr('offline.checking'))).toBeTruthy();
  });
});

describe('useConnectivity', () => {
  let appStateListener: ((s: AppStateStatus) => void) | undefined;
  beforeEach(() => {
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
      appStateListener = listener as (s: AppStateStatus) => void;
      return { remove: jest.fn() } as never;
    });
  });
  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('is never offline without a backend', async () => {
    const { result } = await renderHook(() => useConnectivity(null));
    await flush();
    expect(result.current.offline).toBe(false);
  });

  it('is not offline before the first check has answered', async () => {
    const probe = jest.fn(() => new Promise<boolean>(() => undefined));
    const { result } = await renderHook(() => useConnectivity(probe));
    expect(result.current.offline).toBe(false);
    expect(result.current.checking).toBe(true);
  });

  it('turns offline on a failed check and back online by itself', async () => {
    jest.useFakeTimers();
    const probe = jest.fn().mockResolvedValueOnce(false).mockResolvedValue(true);
    const { result } = await renderHook(() => useConnectivity(probe));
    await flush();
    expect(result.current.offline).toBe(true);
    await act(async () => {
      jest.advanceTimersByTime(RECHECK_MS);
    });
    await flush();
    expect(result.current.offline).toBe(false);
  });

  it('does not poll while online, and checks again on return to the app', async () => {
    jest.useFakeTimers();
    const probe = jest.fn().mockResolvedValue(true);
    await renderHook(() => useConnectivity(probe));
    await flush();
    await act(async () => {
      jest.advanceTimersByTime(RECHECK_MS * 4);
    });
    expect(probe).toHaveBeenCalledTimes(1);
    await act(async () => appStateListener?.('active'));
    expect(probe).toHaveBeenCalledTimes(2);
  });

  it('"continue offline" holds until the connection is seen again', async () => {
    const probe = jest
      .fn()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);
    const { result } = await renderHook(() => useConnectivity(probe));
    await flush();
    await act(async () => result.current.dismiss());
    expect(result.current.dismissed).toBe(true);
    await act(async () => result.current.recheck());
    await flush();
    expect(result.current.dismissed).toBe(false); // online again: the choice is spent
    await act(async () => result.current.recheck());
    await flush();
    expect(result.current.offline).toBe(true);
    expect(result.current.dismissed).toBe(false); // so going offline later shows the notice again
  });
});
