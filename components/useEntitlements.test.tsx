import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';
import { NO_ENTITLEMENTS, resolveEntitlements, type Entitlements } from '../lib/entitlement';
import { InMemoryEntitlementStore } from '../lib/entitlementStore';
import { useEntitlements } from './useEntitlements';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Driven through a host component rather than renderHook, as elsewhere in this repo.

let hostSeq = 0;
let TID = 'e';
beforeEach(() => {
  hostSeq += 1;
  TID = `e-${hostSeq}`;
});

function Host(props: Parameters<typeof useEntitlements>[0]) {
  const { entitlements } = useEntitlements(props);
  return <Text testID={TID}>{entitlements.fullGame ? 'unlocked' : 'locked'}</Text>;
}

describe('useEntitlements', () => {
  it('shows the cached state at once, then what the server says', async () => {
    const store = new InMemoryEntitlementStore(resolveEntitlements(['full_game']));
    let resolve: (e: Entitlements) => void = () => undefined;
    const source = { fetch: () => new Promise<Entitlements>((r) => (resolve = r)) };
    await render(<Host source={source} store={store} />);
    await waitFor(() => expect(screen.getByTestId(TID)).toHaveTextContent('unlocked'));
    resolve(NO_ENTITLEMENTS); // e.g. a refund
    await waitFor(() => expect(screen.getByTestId(TID)).toHaveTextContent('locked'));
    await expect(store.load()).resolves.toEqual(NO_ENTITLEMENTS);
  });

  it('keeps the cached state when the server cannot be reached', async () => {
    const store = new InMemoryEntitlementStore(resolveEntitlements(['family']));
    const fetch = jest.fn().mockRejectedValue(new Error('offline'));
    await render(<Host source={{ fetch }} store={store} />);
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(screen.getByTestId(TID)).toHaveTextContent('unlocked');
  });

  it('runs on the cache alone without a backend', async () => {
    await render(<Host source={null} store={new InMemoryEntitlementStore()} />);
    expect(screen.getByTestId(TID)).toHaveTextContent('locked');
  });

  // T-269 · review B-12: a deleted Full Game owner must not keep unlimited catching.
  it('reset forgets the entitlements in memory and in the store', async () => {
    const store = new InMemoryEntitlementStore(resolveEntitlements(['full_game']));
    function Resettable() {
      const { entitlements, reset } = useEntitlements({ source: null, store });
      return (
        <Pressable onPress={() => void reset()}>
          <Text testID={TID}>{entitlements.fullGame ? 'unlocked' : 'locked'}</Text>
        </Pressable>
      );
    }
    await render(<Resettable />);
    await waitFor(() => expect(screen.getByTestId(TID)).toHaveTextContent('unlocked'));
    await act(async () => fireEvent.press(screen.getByTestId(TID)));
    expect(screen.getByTestId(TID)).toHaveTextContent('locked');
    await expect(store.load()).resolves.toEqual(NO_ENTITLEMENTS);
  });
});
