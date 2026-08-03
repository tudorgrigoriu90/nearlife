import { render, screen } from '@testing-library/react-native';
import SpeciesHero from './SpeciesHero';
import { KRONOBERG_SPECIES } from '../lib/species/kronoberg';

const swift = KRONOBERG_SPECIES.find((s) => s.id === 'common-swift')!;

describe('SpeciesHero', () => {
  it('shows the photo attribution once the species is spotted', async () => {
    await render(<SpeciesHero species={swift} spotted />);
    expect(screen.getByText(/via Wikimedia Commons/)).toBeTruthy();
  });

  it('keeps the pre-spot silhouette (no photo/credit) before spotting', async () => {
    await render(<SpeciesHero species={swift} spotted={false} />);
    expect(screen.queryByText(/via Wikimedia Commons/)).toBeNull();
  });
});
