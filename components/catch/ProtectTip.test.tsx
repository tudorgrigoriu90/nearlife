import { fireEvent, render, screen } from '@testing-library/react-native';
import ProtectTip from './ProtectTip';
import { KRONOBERG_SPECIES } from '../../lib/species/kronoberg';
import { contentFor } from '../../lib/species/localized';
import { createTranslator } from '../../lib/i18n';
import type { Species } from '../../lib/species/types';

const tr = createTranslator('en');
const swift = KRONOBERG_SPECIES.find((s) => s.id === 'common-swift')!;

describe('ProtectTip', () => {
  it('shows the species protect content on the catch-success moment', async () => {
    await render(<ProtectTip species={swift} onDone={() => {}} />);
    expect(screen.getByText(contentFor(swift.id, 'en')!.protect)).toBeTruthy();
  });

  it('calls onDone when the continue CTA is pressed', async () => {
    const onDone = jest.fn();
    await render(<ProtectTip species={swift} onDone={onDone} />);
    fireEvent.press(screen.getByText(tr('catch.continue')));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("celebrates a prime catch, made inside the species' active season (T-074)", async () => {
    await render(<ProtectTip species={swift} prime onDone={() => {}} />);
    expect(screen.getByText(`✨ ${tr('catch.prime')}`)).toBeTruthy();
  });

  it('says nothing about prime for a catch outside the season', async () => {
    await render(<ProtectTip species={swift} onDone={() => {}} />);
    expect(screen.queryByText(`✨ ${tr('catch.prime')}`)).toBeNull();
  });
});

// T-273 · review B-10: a catalogue species has no bundled content; the screen shows the content
// the card loaded from the database.
const catalogueSpecies = {
  id: 'gbif:5228676',
  scientificName: 'Thysselinum palustre',
  commonName: 'Hogfennel',
  category: 'plant',
  rarity: 'common',
  activeMonths: [6, 7, 8],
} as Species;
const loaded = {
  speciesId: 'gbif:5228676',
  fact: '',
  whenAndHow: 'Active in your region from June to August.',
  give: 'Leave the wet meadow edges unmown until autumn.',
  protect: 'Keep drainage out of the fens where it grows.',
};

describe('ProtectTip for a catalogue species', () => {
  it('shows the protect tip from the loaded content', async () => {
    await render(
      <ProtectTip species={catalogueSpecies} content={loaded} locale="en" onDone={() => {}} />,
    );
    expect(screen.getByText(loaded.protect)).toBeTruthy();
  });
});
