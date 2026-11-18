import { fireEvent, render, screen } from '@testing-library/react-native';
import ThisWeekScreen from './ThisWeekScreen';
import { createTranslator } from '../lib/i18n';

const tr = createTranslator('en');

describe('ThisWeekScreen', () => {
  it('renders the pull surface with the honest "active this season" footnote', async () => {
    await render(<ThisWeekScreen locale="en" spottedIds={new Set()} />);
    expect(screen.getByText(tr('thisWeek.title'), { exact: false })).toBeTruthy();
    expect(screen.getByText(tr('thisWeek.honesty'))).toBeTruthy();
  });

  it('shows the user\'s county with every active species counted, not only the rows shown', async () => {
    const live = {
      state: 'active' as const,
      total: 1834,
      items: [
        { species: { id: 'pike', scientificName: 'Esox lucius', category: 'fish' } as never, commonName: 'Gädda', detail: 'I grunda vikar', isNew: true },
        { species: { id: 'frog', scientificName: 'Rana temporaria', category: 'mammal' } as never, commonName: 'Rana temporaria', detail: null, isNew: false },
      ],
    };
    await render(<ThisWeekScreen locale="en" live={live} regionName="Skåne" />);
    expect(screen.getByText(tr('thisWeek.subtitle', { region: 'Skåne', count: 1834 }))).toBeTruthy();
    expect(screen.getByText('Gädda')).toBeTruthy();
    expect(screen.getByText('I grunda vikar')).toBeTruthy();
    expect(screen.getAllByText('Rana temporaria')).toHaveLength(2); // name falls back, detail too
    expect(screen.getAllByText(tr('thisWeek.new'))).toHaveLength(1);
  });

  it('offers to identify something with iNaturalist when the app can open it (T-223)', async () => {
    const onIdentify = jest.fn();
    await render(<ThisWeekScreen locale="en" onIdentify={onIdentify} />);
    await fireEvent.press(screen.getByText(`📷 ${tr('identify.cta')}`));
    expect(onIdentify).toHaveBeenCalledTimes(1);
  });

  it('shows no identify button without a handler', async () => {
    await render(<ThisWeekScreen locale="en" />);
    expect(screen.queryByText(`📷 ${tr('identify.cta')}`)).toBeNull();
  });
});

// T-275 · review B-15: with a home county the bundled Kronoberg list is never shown; while the
// county loads there is a loading state, and a failed load says so with a retry.
describe('ThisWeekScreen with a county', () => {
  it('shows a loading state, not the Kronoberg list, while the county loads', async () => {
    await render(<ThisWeekScreen locale="en" status="loading" regionName="Norrbotten" />);
    expect(screen.queryByText(tr('region.kronoberg'), { exact: false })).toBeNull();
    expect(screen.getByTestId('thisweek-loading')).toBeTruthy();
  });

  it('a failed load offers a retry', async () => {
    const onRetry = jest.fn();
    await render(
      <ThisWeekScreen locale="en" status="error" regionName="Norrbotten" onRetry={onRetry} />,
    );
    expect(screen.getByText(tr('thisWeek.loadError'))).toBeTruthy();
    await fireEvent.press(screen.getByText(tr('thisWeek.retry')));
    expect(onRetry).toHaveBeenCalled();
  });
});
