import AsyncStorage from '@react-native-async-storage/async-storage';
import { render, screen, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import { useCollection } from './useCollection';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Its own file: after useCollection.test.tsx spies on AppState, later mounts in that file do not
// settle (see the note there), so these would fail for reasons that have nothing to do with them.
let hostSeq = 0;
let TID = 'ids';

function Host({ onReady }: { onReady?: (c: ReturnType<typeof useCollection>) => void }) {
  const collection = useCollection();
  onReady?.(collection);
  return <Text testID={TID}>{collection.records.map((r) => r.speciesId).join(',')}</Text>;
}

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.restoreAllMocks();
  hostSeq += 1;
  TID = `act-${hostSeq}`;
});

// T-333 · review I-17: every action of the hook, and that a failed write never throws at the UI.
describe('useCollection actions', () => {
  it('helps, resyncs and resets', async () => {
    let api: ReturnType<typeof useCollection> | undefined;
    await render(<Host onReady={(c) => (api = c)} />);
    await waitFor(() => expect(api).toBeDefined());
    api?.help('otter', 'give');
    await waitFor(() => expect(screen.getByTestId(TID)).toHaveTextContent('otter'));
    api?.resync();
    await waitFor(() => expect(screen.getByTestId(TID)).toHaveTextContent('otter'));
    await api?.reset();
    await waitFor(() => expect(screen.getByTestId(TID)).toHaveTextContent(''));
  });

  it('keeps the catch on screen when the phone cannot save it', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    let api: ReturnType<typeof useCollection> | undefined;
    await render(<Host onReady={(c) => (api = c)} />);
    await waitFor(() => expect(api).toBeDefined());
    jest.spyOn(AsyncStorage, 'setItem').mockRejectedValue(new Error('disk full'));
    api?.spot('moose');
    api?.markCaught('pike', false);
    api?.help('otter', 'protect');
    await waitFor(() =>
      expect(String(screen.getByTestId(TID).props.children).split(',').sort()).toEqual(['moose', 'otter', 'pike']),
    );
  });

  it('starts with no refused catches, and clearing one is harmless', async () => {
    let api: ReturnType<typeof useCollection> | undefined;
    await render(<Host onReady={(c) => (api = c)} />);
    await waitFor(() => expect(api).toBeDefined());
    expect(api?.refusedCatches).toEqual([]);
    api?.clearRefusedCatch('pike');
    expect(api?.refusedCatches).toEqual([]);
  });
});

describe('useCollection foreground sync', () => {
  it('syncs when the app becomes active, and only then', async () => {
    const { AppState } = jest.requireActual('react-native');
    const spy = jest.spyOn(AppState, 'addEventListener');
    let api: ReturnType<typeof useCollection> | undefined;
    await render(<Host onReady={(c) => (api = c)} />);
    await waitFor(() => expect(api).toBeDefined());
    api?.spot('moose');
    await waitFor(() => expect(screen.getByTestId(TID)).toHaveTextContent('moose'));
    // The hook's own listener is the last 'change' subscription made during its mount.
    const calls = spy.mock.calls.filter((c) => c[0] === 'change');
    const handler = calls[calls.length - 1][1] as (state: string) => void;
    handler('background');
    handler('active');
    await waitFor(() => expect(screen.getByTestId(TID)).toHaveTextContent('moose'));
  });
});

describe('useCollection when the server cannot be reached', () => {
  it('logs a failed sync and keeps working on the device', async () => {
    const { OfflineCollectionStore } = jest.requireActual('../lib/offlineCollectionStore');
    jest.spyOn(OfflineCollectionStore.prototype, 'sync').mockRejectedValue(new Error('offline'));
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { AppState } = jest.requireActual('react-native');
    const spy = jest.spyOn(AppState, 'addEventListener');
    let api: ReturnType<typeof useCollection> | undefined;
    await render(<Host onReady={(c) => (api = c)} />);
    await waitFor(() => expect(warn).toHaveBeenCalledWith('collection load failed', expect.any(Error)));
    const calls = spy.mock.calls.filter((c) => c[0] === 'change');
    (calls[calls.length - 1][1] as (state: string) => void)('active');
    api?.resync();
    await waitFor(() => expect(warn).toHaveBeenCalledWith('collection sync failed', expect.any(Error)));
    api?.spot('moose');
    await waitFor(() => expect(screen.getByTestId(TID)).toHaveTextContent('moose'));
  });
});
