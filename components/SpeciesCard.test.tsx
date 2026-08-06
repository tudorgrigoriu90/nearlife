import { fireEvent, render, screen } from '@testing-library/react-native';
import SpeciesCard from './SpeciesCard';
import { KRONOBERG_SPECIES } from '../lib/species/kronoberg';
import { commonNameFor, contentFor } from '../lib/species/localized';
import { createTranslator } from '../lib/i18n';

const tr = createTranslator('en');
const swift = KRONOBERG_SPECIES.find((s) => s.id === 'common-swift')!;
// Content is passed in now (T-059) — the caller loads it via SpeciesRepository. Tests supply the
// bundled content directly so the card stays a pure presentational component.
const swiftContent = contentFor('common-swift', 'en');

describe('SpeciesCard', () => {
  it('shows the always-free mission content (name, give, protect) even before spotting', async () => {
    await render(<SpeciesCard species={swift} content={swiftContent} locale="en" />);
    expect(screen.getByText(commonNameFor(swift, 'en'))).toBeTruthy();
    expect(screen.getByText(tr('card.give'))).toBeTruthy();
    expect(screen.getByText(tr('card.protect'))).toBeTruthy();
  });

  it('hides the mission block until content has loaded (null content)', async () => {
    await render(<SpeciesCard species={swift} content={null} locale="en" />);
    // Name + scientific name (from the species) still render; mission sections do not.
    expect(screen.getByText(commonNameFor(swift, 'en'))).toBeTruthy();
    expect(screen.queryByText(tr('card.give'))).toBeNull();
  });

  it('launches the catch flow from "find it nearby"', async () => {
    const onFindNearby = jest.fn();
    await render(
      <SpeciesCard species={swift} content={swiftContent} locale="en" onFindNearby={onFindNearby} />,
    );
    fireEvent.press(screen.getByText(tr('card.findNearby'), { exact: false }));
    expect(onFindNearby).toHaveBeenCalledTimes(1);
  });
});
