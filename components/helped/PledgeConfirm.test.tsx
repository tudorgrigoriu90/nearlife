import { fireEvent, render, screen } from '@testing-library/react-native';
import PledgeConfirm from './PledgeConfirm';
import { KRONOBERG_SPECIES } from '../../lib/species/kronoberg';
import { createTranslator } from '../../lib/i18n';
import type { Species } from '../../lib/species/types';

const tr = createTranslator('en');
const swift = KRONOBERG_SPECIES.find((s) => s.id === 'common-swift')!;

describe('PledgeConfirm', () => {
  it('confirms an honor-system pledge with the follow-law line', async () => {
    await render(<PledgeConfirm species={swift} kind="give" locale="en" onDone={() => {}} />);
    expect(screen.getByText(tr('pledge.thanks'))).toBeTruthy();
    expect(screen.getByText(/⚖/)).toBeTruthy();
  });

  it('calls onDone when the CTA is pressed', async () => {
    const onDone = jest.fn();
    await render(<PledgeConfirm species={swift} kind="protect" locale="en" onDone={onDone} />);
    fireEvent.press(screen.getByText(tr('pledge.done')));
    expect(onDone).toHaveBeenCalledTimes(1);
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

describe('PledgeConfirm for a catalogue species', () => {
  it('shows the pledged action from the loaded content', async () => {
    await render(
      <PledgeConfirm
        species={catalogueSpecies}
        content={loaded}
        kind="give"
        locale="en"
        onDone={() => {}}
      />,
    );
    expect(screen.getByText(loaded.give)).toBeTruthy();
  });
});
