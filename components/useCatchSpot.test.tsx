import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';
import { InMemoryCatchSpotStore } from '../lib/catchSpotStore';
import type { CatchSpot, CatchSpotSource } from '../lib/catchSpots';
import { useCatchSpot, type UseCatchSpotInput } from './useCatchSpot';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const LAKE: CatchSpot = { id: 'n1', kind: 'fishing', habitat: 'freshwater', name: null, lat: 56.8827, lon: 14.8121 };
const HILL: CatchSpot = { id: 'n2', kind: 'viewpoint', habitat: 'land', name: null, lat: 56.8877, lon: 14.8091 };
const FAR = { latitude: 56.8777, longitude: 14.8091 };
const AT_LAKE = { latitude: 56.8827, longitude: 14.8124 };
const pike = { id: 'gbif:1', category: 'fish' as const };

let seq = 0;
let TID = 'c';
beforeEach(() => {
  seq += 1;
  TID = `c-${seq}`;
});

function Host(props: UseCatchSpotInput) {
  const { view, checkAgain } = useCatchSpot(props);
  return (
    <>
      <Text testID={TID}>{view ? `${view.state}:${view.spot?.id ?? '-'}` : 'loading'}</Text>
      <Pressable onPress={checkAgain}>
        <Text>again</Text>
      </Pressable>
    </>
  );
}

function source(spots: CatchSpot[], habitats: CatchSpot['habitat'][] | null = null): CatchSpotSource {
  return { forRegion: jest.fn().mockResolvedValue(spots), habitatsOf: jest.fn().mockResolvedValue(habitats) };
}

describe('useCatchSpot', () => {
  it('finds the nearest spot that suits the species', async () => {
    await render(
      <Host species={pike} regionId="SWE.9_1" source={source([LAKE, HILL])} store={new InMemoryCatchSpotStore()} getFix={async () => FAR} />,
    );
    await waitFor(() => expect(screen.getByTestId(TID)).toHaveTextContent('too-far:n1'));
  });

  it('re-checks the position after the user has walked there', async () => {
    const fixes = [FAR, AT_LAKE];
    const getFix = jest.fn(async () => fixes.shift() ?? AT_LAKE);
    await render(
      <Host species={pike} regionId="SWE.9_1" source={source([LAKE])} store={new InMemoryCatchSpotStore()} getFix={getFix} />,
    );
    await waitFor(() => expect(screen.getByTestId(TID)).toHaveTextContent('too-far:n1'));
    await fireEvent.press(screen.getByText('again'));
    await waitFor(() => expect(screen.getByTestId(TID)).toHaveTextContent('in-range:n1'));
  });

  it('works offline from the last download', async () => {
    const store = new InMemoryCatchSpotStore();
    await store.save('SWE.9_1', [LAKE]);
    const offline: CatchSpotSource = {
      forRegion: jest.fn().mockRejectedValue(new Error('offline')),
      habitatsOf: jest.fn().mockRejectedValue(new Error('offline')),
    };
    await render(<Host species={pike} regionId="SWE.9_1" source={offline} store={store} getFix={async () => AT_LAKE} />);
    await waitFor(() => expect(screen.getByTestId(TID)).toHaveTextContent('in-range:n1'));
  });

  it('uses the species’ own habitats from the database', async () => {
    // A species the database knows lives on land is sent to the hill, not the lake.
    await render(
      <Host species={pike} regionId="SWE.9_1" source={source([LAKE, HILL], ['land'])} store={new InMemoryCatchSpotStore()} getFix={async () => FAR} />,
    );
    await waitFor(() => expect(screen.getByTestId(TID)).toHaveTextContent('too-far:n2'));
  });
});
