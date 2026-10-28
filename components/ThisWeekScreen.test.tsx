import { render, screen } from '@testing-library/react-native';
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
});
