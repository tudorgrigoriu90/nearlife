import { fireEvent, render, screen } from '@testing-library/react-native';
import ConfusedWith from './ConfusedWith';
import { createTranslator } from '../lib/i18n';
import type { Species } from '../lib/species/types';

// T-352 · review F-13.
const tr = createTranslator('en');
const sp = (id: string, name: string) =>
  ({ id, scientificName: `Parus ${id}`, commonName: name, category: 'bird', rarity: 'common', activeMonths: [5] }) as Species;

describe('ConfusedWith', () => {
  it('lists the lookalikes and opens one', async () => {
    const onOpen = jest.fn();
    await render(<ConfusedWith locale="en" species={[sp('a', 'Coal Tit'), sp('b', 'Marsh Tit')]} onOpen={onOpen} />);
    expect(screen.getByText(tr('card.confusedWith'))).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Marsh Tit'));
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: 'b' }));
  });

  it('shows nothing without lookalikes', async () => {
    await render(<ConfusedWith locale="en" species={[]} onOpen={() => undefined} />);
    expect(screen.queryByText(tr('card.confusedWith'))).toBeNull();
  });
});

// T-387: with dual display on, each lookalike also carries its name in the second language.
describe('ConfusedWith in two languages', () => {
  it('shows the second-language name under the first, where there is one', async () => {
    await render(
      <ConfusedWith
        locale="en"
        species={[sp('a', 'Linnet'), sp('b', 'Twite')]}
        onOpen={() => undefined}
        secondaryLocale="ro"
        secondaryNames={{ a: 'Cânepar' }}
      />,
    );
    expect(screen.getByText('Linnet')).toBeTruthy();
    expect(screen.getByText('Cânepar')).toBeTruthy();
    expect(screen.getByLabelText('Linnet, Cânepar')).toBeTruthy();
    expect(screen.getByLabelText('Twite')).toBeTruthy();
  });

  it('shows one name when the second language is off', async () => {
    await render(<ConfusedWith locale="en" species={[sp('a', 'Linnet')]} onOpen={() => undefined} secondaryNames={{ a: 'Cânepar' }} />);
    expect(screen.queryByText('Cânepar')).toBeNull();
  });
});
