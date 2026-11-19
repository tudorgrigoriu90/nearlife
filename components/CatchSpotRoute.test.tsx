import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import CatchSpotRoute from './CatchSpotRoute';
import { InMemoryCatchSpotStore } from '../lib/catchSpotStore';
import type { CatchSpot, CatchSpotSource } from '../lib/catchSpots';
import { createTranslator } from '../lib/i18n';
import type { Species } from '../lib/species/types';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// T-333 · review I-17: the glue between the catch-spot hook and screen, end to end on fakes.
const tr = createTranslator('en');
const LAKE: CatchSpot = { id: 'n1', kind: 'fishing', habitat: 'freshwater', name: 'Sjön', lat: 56.8827, lon: 14.8121 };
const pike: Species = { id: 'gbif:1', scientificName: 'Esox lucius', commonName: 'Pike', category: 'fish', rarity: 'common', activeMonths: [5] };
const source = (spots: CatchSpot[]): CatchSpotSource => ({
  forRegion: jest.fn().mockResolvedValue(spots),
  habitatsOf: jest.fn().mockResolvedValue(['freshwater']),
});

afterEach(() => jest.useRealTimers());

function route(getFix: () => Promise<{ latitude: number; longitude: number } | null>, allowLocation?: () => Promise<boolean>) {
  return render(
    <CatchSpotRoute
      species={pike}
      speciesName="Pike"
      regionId="SWE.9_1"
      source={source([LAKE])}
      store={new InMemoryCatchSpotStore()}
      getFix={getFix}
      locale="en"
      onCatch={jest.fn()}
      onBack={jest.fn()}
      allowLocation={allowLocation}
    />,
  );
}

describe('CatchSpotRoute', () => {
  it('shows the nearest suitable spot, with the ice line in winter', async () => {
    jest.useFakeTimers({ now: new Date('2026-01-15T11:00:00Z'), doNotFake: ['nextTick', 'setImmediate'] });
    await route(async () => ({ latitude: 56.8777, longitude: 14.8091 }));
    await waitFor(() => expect(screen.getByText('Sjön')).toBeTruthy());
    expect(screen.getByText(tr('catchSpot.ice'))).toBeTruthy();
  });

  it('asks for location, and checks again once it is allowed', async () => {
    const getFix = jest.fn().mockResolvedValueOnce(null).mockResolvedValue({ latitude: 56.8827, longitude: 14.8124 });
    const allow = jest.fn().mockResolvedValue(true);
    await route(getFix, allow);
    await fireEvent.press(await screen.findByText(tr('catchSpot.allowLocation')));
    await waitFor(() => expect(screen.getByText(tr('catchSpot.here'))).toBeTruthy());
    expect(allow).toHaveBeenCalled();
  });
});
