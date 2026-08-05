import { render, screen } from '@testing-library/react-native';
import AlmanacScreen from './AlmanacScreen';
import { KRONOBERG_SPECIES } from '../lib/species/kronoberg';
import { createTranslator } from '../lib/i18n';

const tr = createTranslator('en');

// Rendering the full 54-species grid (a FlatList of Cells) is a heavy RNTL render: ~420ms in
// isolation, but it exceeds jest's 5000ms default under CPU load (observed flaking while a clean
// install saturated the machine). A generous explicit budget removes the false-red without hiding
// a genuine hang. Mirrors App.test's FLOW_TIMEOUT convention.
const RENDER_TIMEOUT = 20000;

describe('AlmanacScreen', () => {
  it('shows a loading state', async () => {
    await render(<AlmanacScreen species={[]} loading />);
    expect(screen.getByText(tr('almanac.loading'))).toBeTruthy();
  });

  it(
    'renders the grid with category filters over the curated set',
    async () => {
      await render(<AlmanacScreen species={KRONOBERG_SPECIES} records={[]} />);
      expect(screen.getByText(tr('almanac.filter.all'))).toBeTruthy();
    },
    RENDER_TIMEOUT,
  );
});
