import { fireEvent, render, screen } from '@testing-library/react-native';
import FieldNotes from './FieldNotes';
import { createTranslator } from '../lib/i18n';

// T-347 · review F-07.
const tr = createTranslator('en');

describe('FieldNotes', () => {
  it('adds a note dated today by default', async () => {
    const onAdd = jest.fn(() => true);
    await render(<FieldNotes locale="en" notes={[]} onAdd={onAdd} />);
    await fireEvent.press(screen.getByText(`✎ ${tr('notes.add')}`));
    await fireEvent.changeText(screen.getByLabelText(tr('notes.placeholder')), 'Heard it at dusk');
    await fireEvent.press(screen.getByText(tr('notes.save')));
    expect(onAdd).toHaveBeenCalledWith(new Date().toISOString().slice(0, 10), 'Heard it at dusk');
    expect(screen.getByText(`✎ ${tr('notes.add')}`)).toBeTruthy(); // the editor closed
  });

  it('keeps the editor open and says why when a note cannot be kept', async () => {
    await render(<FieldNotes locale="en" notes={[]} onAdd={() => false} />);
    await fireEvent.press(screen.getByText(`✎ ${tr('notes.add')}`));
    await fireEvent.press(screen.getByText(tr('notes.save')));
    expect(screen.getByText(tr('notes.invalid'))).toBeTruthy();
  });

  it('lists the notes under "Your notes"', async () => {
    await render(
      <FieldNotes locale="en" notes={[{ id: 'a', speciesId: 'owl', date: '2026-11-03', text: 'Saw two' }]} onAdd={() => true} />,
    );
    expect(screen.getByText(tr('notes.title'))).toBeTruthy();
    expect(screen.getByText('Saw two')).toBeTruthy();
    expect(screen.getByText('2026-11-03')).toBeTruthy();
  });
});
