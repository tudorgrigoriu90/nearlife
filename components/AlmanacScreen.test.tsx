import { render, screen } from '@testing-library/react-native';
import AlmanacScreen from './AlmanacScreen';
import { KRONOBERG_SPECIES } from '../lib/species/kronoberg';
import { createTranslator } from '../lib/i18n';

const tr = createTranslator('en');

describe('AlmanacScreen', () => {
  it('shows a loading state', async () => {
    await render(<AlmanacScreen species={[]} loading />);
    expect(screen.getByText(tr('almanac.loading'))).toBeTruthy();
  });

  it('renders the grid with category filters over the curated set', async () => {
    await render(<AlmanacScreen species={KRONOBERG_SPECIES} records={[]} />);
    expect(screen.getByText(tr('almanac.filter.all'))).toBeTruthy();
  });
});
