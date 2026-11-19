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
