import { fireEvent, render, screen } from '@testing-library/react-native';
import { Linking } from 'react-native';
import SpeciesCard from './SpeciesCard';
import { createTranslator } from '../lib/i18n';
import type { SpeciesContent } from '../lib/species/content';
import { KRONOBERG_SPECIES } from '../lib/species/kronoberg';

// T-276 · review B-59: Wikipedia text is CC BY-SA 4.0. Every fact from it is credited on the card
// with a link to its article, and a machine translation says so.

const sv = createTranslator('sv');
const swift = KRONOBERG_SPECIES.find((s) => s.id === 'common-swift')!;
const base: SpeciesContent = {
  speciesId: 'common-swift',
  fact: 'Tornseglaren tillbringar nästan hela livet i luften.',
  whenAndHow: 'w',
  give: 'g',
  protect: 'p',
};

describe('the fact credit line', () => {
  it('credits a Wikipedia fact and links to its article', async () => {
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    const url = 'https://sv.wikipedia.org/wiki/Tornseglare';
    await render(
      <SpeciesCard
        species={swift}
        locale="sv"
        content={{ ...base, factSourceUrl: url, factOrigin: 'wikipedia' }}
      />,
    );
    await fireEvent.press(screen.getByText(sv('card.factCredit')));
    expect(open).toHaveBeenCalledWith(url);
  });

  it('says when the fact was machine-translated', async () => {
    await render(
      <SpeciesCard
        species={swift}
        locale="sv"
        content={{
          ...base,
          factSourceUrl: 'https://en.wikipedia.org/wiki/Common_swift',
          factOrigin: 'wikipedia-translated',
        }}
      />,
    );
    expect(screen.getByText(sv('card.factCreditTranslated'))).toBeTruthy();
  });

  it('shows no Wikipedia credit on the project’s own text', async () => {
    await render(<SpeciesCard species={swift} locale="sv" content={base} />);
    expect(screen.queryByText(sv('card.factCredit'))).toBeNull();
  });
});
