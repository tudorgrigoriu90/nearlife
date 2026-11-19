import { fireEvent, render, screen } from '@testing-library/react-native';
import NameTrainerScreen from './NameTrainerScreen';
import { createTranslator } from '../lib/i18n';
import type { Species } from '../lib/species/types';

// T-351 · review F-06.
const tr = createTranslator('en');
const sp = (id: string, en: string, sv: string): Species =>
  ({ id, scientificName: `${id} sci`, commonName: en, names: { sv } }) as unknown as Species;

describe('NameTrainerScreen', () => {
  it('shows the photo first, then both names, and records the answer', async () => {
    const onAnswer = jest.fn();
    await render(
      <NameTrainerScreen
        locale="en"
        spotted={[sp('owl', 'Tawny Owl', 'kattuggla'), sp('jay', 'Eurasian Jay', 'nötskrika')]}
        state={{}}
        other="en"
        today="2026-11-19"
        onAnswer={onAnswer}
        onDone={() => undefined}
      />,
    );
    expect(screen.queryByText('Kattuggla')).toBeNull();
    await fireEvent.press(screen.getByText(tr('trainer.reveal')));
    expect(screen.getByText('Kattuggla')).toBeTruthy();
    expect(screen.getByText('Tawny Owl')).toBeTruthy();
    await fireEvent.press(screen.getByText(tr('trainer.learning')));
    expect(onAnswer).toHaveBeenCalledWith('owl', 'learning', '2026-11-19');
    await fireEvent.press(screen.getByText(tr('trainer.reveal')));
    await fireEvent.press(screen.getByText(tr('trainer.knew')));
    expect(onAnswer).toHaveBeenLastCalledWith('jay', 'knew', '2026-11-19');
    expect(screen.getByText(tr('trainer.finished'))).toBeTruthy();
  });

  it('leaves out species without a sourced name in both languages', async () => {
    await render(
      <NameTrainerScreen
        locale="en"
        spotted={[{ id: 'x', scientificName: 'X x', commonName: 'X x' } as Species]}
        state={{}}
        other="en"
        today="2026-11-19"
        onAnswer={() => undefined}
        onDone={() => undefined}
      />,
    );
    expect(screen.getByText(tr('trainer.empty'))).toBeTruthy();
  });

  it('closes with Done', async () => {
    const onDone = jest.fn();
    await render(
      <NameTrainerScreen locale="en" spotted={[]} state={{}} other="en" today="2026-11-19" onAnswer={() => undefined} onDone={onDone} />,
    );
    await fireEvent.press(screen.getByText(tr('settings.done')));
    expect(onDone).toHaveBeenCalled();
  });
});
