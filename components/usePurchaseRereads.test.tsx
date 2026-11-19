import { render } from '@testing-library/react-native';
import { act } from 'react';
import { Text } from 'react-native';
import { usePurchaseRereads } from './usePurchaseRereads';

// T-302 · review B-47: the re-reads after a payment stop when the unlock arrives or the app closes.

let start: (() => void) | null = null;
const keepStart = (fn: () => void) => {
  start = fn;
};
const DELAYS = [0, 5000, 10000];
function Host({ refresh, unlocked }: { refresh: () => void; unlocked: string }) {
  keepStart(usePurchaseRereads(refresh, unlocked, DELAYS));
  return <Text>host</Text>;
}

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe('usePurchaseRereads', () => {
  it('re-reads on the schedule after a purchase', async () => {
    const refresh = jest.fn();
    await render(<Host refresh={refresh} unlocked="none" />);
    act(() => start?.());
    act(() => jest.advanceTimersByTime(10000));
    expect(refresh).toHaveBeenCalledTimes(3);
  });

  it('stops once the unlock arrives', async () => {
    const refresh = jest.fn();
    const view = await render(<Host refresh={refresh} unlocked="none" />);
    act(() => start?.());
    act(() => jest.advanceTimersByTime(0));
    await view.rerender(<Host refresh={refresh} unlocked="fullGame" />);
    act(() => jest.advanceTimersByTime(20000));
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('leaves no timer behind when the app goes away', async () => {
    const refresh = jest.fn();
    const view = await render(<Host refresh={refresh} unlocked="none" />);
    act(() => start?.());
    await view.unmount();
    act(() => jest.advanceTimersByTime(20000));
    expect(refresh).toHaveBeenCalledTimes(0);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('a second purchase restarts the schedule instead of doubling it', async () => {
    const refresh = jest.fn();
    await render(<Host refresh={refresh} unlocked="none" />);
    act(() => start?.());
    act(() => start?.());
    act(() => jest.advanceTimersByTime(10000));
    expect(refresh).toHaveBeenCalledTimes(3);
  });
});
