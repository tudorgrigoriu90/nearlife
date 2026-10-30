import { fireEvent, render, screen } from '@testing-library/react-native';
import { Linking } from 'react-native';
import CatchSpotScreen from './CatchSpotScreen';
import { createTranslator } from '../lib/i18n';
import type { CatchSpotView } from '../lib/catchSpots';

const tr = createTranslator('en');
const spot = { id: 'n1', kind: 'bird_hide', habitat: 'freshwater' as const, name: 'Fågeltornet', lat: 56.88, lon: 14.81 };

function view(over: Partial<CatchSpotView>): CatchSpotView {
  return { state: 'too-far', spot, distanceM: 1250, ...over };
}

describe('CatchSpotScreen (T-068)', () => {
  it('when far away: where to go, how far, and directions', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    await render(<CatchSpotScreen locale="en" speciesName="Pike" view={view({})} onCatch={jest.fn()} onCheckAgain={jest.fn()} />);
    expect(screen.getByText('Fågeltornet')).toBeTruthy();
    expect(screen.getByText(tr('catchSpot.distance', { distance: '1.3 km' }))).toBeTruthy();
    await fireEvent.press(screen.getByText(tr('catchSpot.directions')));
    // Only the destination goes to the maps app, never the user's own position.
    expect(openURL).toHaveBeenCalledWith(
      'https://www.google.com/maps/dir/?api=1&destination=56.88,14.81&travelmode=walking',
    );
    expect(screen.queryByText(tr('catchSpot.catch'))).toBeNull();
  });

  it('when there: catch', async () => {
    const onCatch = jest.fn();
    await render(
      <CatchSpotScreen locale="en" speciesName="Pike" view={view({ state: 'in-range', distanceM: 40 })} onCatch={onCatch} onCheckAgain={jest.fn()} />,
    );
    await fireEvent.press(screen.getByText(tr('catchSpot.catch')));
    expect(onCatch).toHaveBeenCalled();
  });

  it('lets the user re-check their position after walking there', async () => {
    const onCheckAgain = jest.fn();
    await render(<CatchSpotScreen locale="en" speciesName="Pike" view={view({})} onCatch={jest.fn()} onCheckAgain={onCheckAgain} />);
    await fireEvent.press(screen.getByText(tr('catchSpot.checkAgain')));
    expect(onCheckAgain).toHaveBeenCalled();
  });

  it('says plainly when no spot suits the species', async () => {
    await render(
      <CatchSpotScreen
        locale="en"
        speciesName="Pike"
        view={{ state: 'no-spots', spot: null, distanceM: null }}
        onCatch={jest.fn()}
        onCheckAgain={jest.fn()}
      />,
    );
    expect(screen.getByText(tr('catchSpot.noSpots', { species: 'Pike' }))).toBeTruthy();
  });

  it('asks for location when it has no position', async () => {
    await render(
      <CatchSpotScreen
        locale="en"
        speciesName="Pike"
        view={{ state: 'gps-off', spot: null, distanceM: null }}
        onCatch={jest.fn()}
        onCheckAgain={jest.fn()}
      />,
    );
    expect(screen.getByText(tr('catchSpot.gpsOff'))).toBeTruthy();
  });

  it('carries the OpenStreetMap credit', async () => {
    await render(<CatchSpotScreen locale="en" speciesName="Pike" view={view({})} onCatch={jest.fn()} onCheckAgain={jest.fn()} />);
    expect(screen.getByText(tr('catchSpot.osm'))).toBeTruthy();
  });

  it('shows a loading state before the spots arrive', async () => {
    await render(<CatchSpotScreen locale="en" speciesName="Pike" view={null} onCatch={jest.fn()} onCheckAgain={jest.fn()} />);
    expect(screen.getByText(tr('catchSpot.finding'))).toBeTruthy();
  });

  it('in a county not mapped yet, catching works from anywhere and says why', async () => {
    const onCatch = jest.fn();
    await render(
      <CatchSpotScreen
        locale="en"
        speciesName="Pike"
        view={{ state: 'unmapped', spot: null, distanceM: null }}
        onCatch={onCatch}
        onCheckAgain={jest.fn()}
      />,
    );
    expect(screen.getByText(tr('catchSpot.unmapped'))).toBeTruthy();
    await fireEvent.press(screen.getByText(tr('catchSpot.catch')));
    expect(onCatch).toHaveBeenCalled();
  });
});

