import { fireEvent, render, screen } from '@testing-library/react-native';
import SpeciesCard from './SpeciesCard';
import { KRONOBERG_SPECIES } from '../lib/species/kronoberg';
import { commonNameFor } from '../lib/species/localized';
import { createTranslator } from '../lib/i18n';

const tr = createTranslator('en');
const swift = KRONOBERG_SPECIES.find((s) => s.id === 'common-swift')!;

describe('SpeciesCard', () => {
  it('shows the always-free mission content (name, give, protect) even before spotting', async () => {
    await render(<SpeciesCard species={swift} locale="en" />);
    expect(screen.getByText(commonNameFor(swift, 'en'))).toBeTruthy();
    expect(screen.getByText(tr('card.give'))).toBeTruthy();
    expect(screen.getByText(tr('card.protect'))).toBeTruthy();
  });

  it('launches the catch flow from "find it nearby"', async () => {
    const onFindNearby = jest.fn();
    await render(<SpeciesCard species={swift} locale="en" onFindNearby={onFindNearby} />);
    fireEvent.press(screen.getByText(tr('card.findNearby'), { exact: false }));
    expect(onFindNearby).toHaveBeenCalledTimes(1);
  });
});
