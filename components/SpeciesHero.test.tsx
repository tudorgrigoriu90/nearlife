import { fireEvent, render, screen } from '@testing-library/react-native';
import { Linking } from 'react-native';
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

  it('opens the Commons file page when the photo is tapped', async () => {
    // The app ships a ~40 KB thumbnail; full resolution lives on Commons (T-168). Tapping is how
    // a reader gets the large image — and it lands on the page carrying the licence and author,
    // which is what CC-BY/CC-BY-SA attribution actually asks for.
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    await render(<SpeciesHero species={swift} spotted />);
    fireEvent.press(screen.getByTestId('species-photo'));
    expect(openURL).toHaveBeenCalledWith(expect.stringContaining('commons.wikimedia.org'));
  });

  it('is not tappable before the species is spotted', async () => {
    await render(<SpeciesHero species={swift} spotted={false} />);
    expect(screen.queryByTestId('species-photo')).toBeNull();
  });

  it('labels the tap target for screen readers', async () => {
    await render(<SpeciesHero species={swift} spotted />);
    expect(screen.getByTestId('species-photo').props.accessibilityHint).toBeTruthy();
  });
});
