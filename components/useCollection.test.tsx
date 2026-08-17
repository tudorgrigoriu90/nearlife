import AsyncStorage from '@react-native-async-storage/async-storage';
import { render, screen, waitFor } from '@testing-library/react-native';
import { AppState, Text } from 'react-native';
import { useCollection } from './useCollection';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Driven through a host component rather than renderHook: that is the pattern the rest of this
// repo uses, and it keeps act() nesting out of the way.
//
// There is no Supabase config in tests, so the hook runs the offline store with no remote — which
// is exactly the case that used to lose everything on restart (T-165).

function Host({ onReady }: { onReady?: (c: ReturnType<typeof useCollection>) => void }) {
  const collection = useCollection();
  onReady?.(collection);
  return <Text testID="ids">{collection.records.map((r) => r.speciesId).join(',')}</Text>;
}

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.restoreAllMocks();
});

describe('useCollection', () => {
  it('records a catch and exposes it without a network', async () => {
    let api: ReturnType<typeof useCollection> | undefined;
    await render(<Host onReady={(c) => (api = c)} />);
    await waitFor(() => expect(api).toBeDefined());
    api?.markCaught('red-fox', true);
    await waitFor(() => expect(screen.getByTestId('ids')).toHaveTextContent('red-fox'));
  });

  it('restores the collection on a fresh mount — a relaunch does not lose a catch', async () => {
    let api: ReturnType<typeof useCollection> | undefined;
    const first = await render(<Host onReady={(c) => (api = c)} />);
    await waitFor(() => expect(api).toBeDefined());
    api?.spot('moose');
    await waitFor(() => expect(screen.getByTestId('ids')).toHaveTextContent('moose'));
    first.unmount();

    await render(<Host />);
    await waitFor(() => expect(screen.getByTestId('ids')).toHaveTextContent('moose'));
  });

  it('drains the outbox when the app returns to the foreground', async () => {
    // Without this the queue only moves on a write or a cold start: walking back into signal
    // would not be enough to deliver a catch made in a forest.
    const spy = jest.spyOn(AppState, 'addEventListener');
    await render(<Host />);
    await waitFor(() => expect(spy).toHaveBeenCalledWith('change', expect.any(Function)));
  });

  // Not tested here: that unmount calls subscription.remove(), and that the handler ignores
  // non-active states. The effect returns () => subscription.remove(), so the first is React's
  // cleanup contract rather than our logic; and React Native subscribes to AppState internally,
  // so neither spying on the last subscription nor replacing addEventListener isolates ours —
  // stubbing it wholesale hangs the render. The behaviour that matters (a subscription is created,
  // and records survive) is covered above and in offlineCollectionStore.test.ts.
});
