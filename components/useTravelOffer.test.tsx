import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';
import { InMemoryTravelStore } from '../lib/travelStore';
import { useTravelOffer, type TravelOfferInput } from './useTravelOffer';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Driven through a host component rather than renderHook, as elsewhere in this repo.

const HOME = 'SWE.9_1';
// Malmö is in Skåne; Växjö is in Kronoberg.
const MALMO = { latitude: 55.605, longitude: 13.0038 };
const VAXJO = { latitude: 56.8777, longitude: 14.8091 };

let seq = 0;
let TID = 't';
beforeEach(() => {
  seq += 1;
  TID = `t-${seq}`;
});

function Host(props: TravelOfferInput) {
  const { offer, accept, dismiss } = useTravelOffer(props);
  return (
    <>
      <Text testID={TID}>{offer ? offer.name : 'none'}</Text>
      <Pressable onPress={accept}>
        <Text>accept</Text>
      </Pressable>
      <Pressable onPress={dismiss}>
        <Text>dismiss</Text>
      </Pressable>
    </>
  );
}

describe('useTravelOffer', () => {
  it('offers the county the phone is in, away from home', async () => {
    await render(
      <Host enabled homeId={HOME} viewingId={null} getFix={async () => MALMO} store={new InMemoryTravelStore()} />,
    );
    await waitFor(() => expect(screen.getByTestId(TID)).toHaveTextContent('Skåne'));
  });

  it('says nothing at home', async () => {
    const getFix = jest.fn(async () => VAXJO);
    await render(<Host enabled homeId={HOME} viewingId={null} getFix={getFix} store={new InMemoryTravelStore()} />);
    await waitFor(() => expect(getFix).toHaveBeenCalled());
    expect(screen.getByTestId(TID)).toHaveTextContent('none');
  });

  it('never asks for a fix without location consent', async () => {
    const getFix = jest.fn(async () => MALMO);
    await render(
      <Host enabled={false} homeId={HOME} viewingId={null} getFix={getFix} store={new InMemoryTravelStore()} />,
    );
    expect(getFix).not.toHaveBeenCalled();
  });

  it('accepting or dismissing hides it and remembers it was offered', async () => {
    const onAccept = jest.fn();
    const store = new InMemoryTravelStore();
    await render(
      <Host enabled homeId={HOME} viewingId={null} getFix={async () => MALMO} store={store} onAccept={onAccept} />,
    );
    await waitFor(() => expect(screen.getByTestId(TID)).toHaveTextContent('Skåne'));
    await fireEvent.press(screen.getByText('accept'));
    expect(onAccept).toHaveBeenCalledWith({ id: 'SWE.13_1', name: 'Skåne' });
    expect(screen.getByTestId(TID)).toHaveTextContent('none');
    await waitFor(async () => expect(Object.keys(await store.load())).toEqual(['SWE.13_1']));
  });

  it('does not offer again within the cooldown', async () => {
    const store = new InMemoryTravelStore({ 'SWE.13_1': Date.now() });
    const getFix = jest.fn(async () => MALMO);
    await render(<Host enabled homeId={HOME} viewingId={null} getFix={getFix} store={store} />);
    await waitFor(() => expect(getFix).toHaveBeenCalled());
    expect(screen.getByTestId(TID)).toHaveTextContent('none');
  });
});
