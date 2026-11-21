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
    expect(onAdd).toHaveBeenCalledWith(new Date().toISOString().slice(0, 10), 'Heard it at dusk', null);
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

// T-348 · review F-07 (photos).
describe('FieldNotes photos', () => {
  it('takes a photo, previews it, saves it with the note, and can remove it first', async () => {
    const onAdd = jest.fn(() => true);
    const pickPhoto = jest.fn(async () => 'file:///cache/p.jpg');
    await render(<FieldNotes locale="en" notes={[]} onAdd={onAdd} pickPhoto={pickPhoto} photoUri={(n) => n} />);
    await fireEvent.press(screen.getByText(`✎ ${tr('notes.add')}`));
    await fireEvent.changeText(screen.getByLabelText(tr('notes.placeholder')), 'Two at the feeder');
    await fireEvent.press(screen.getByText(`📷 ${tr('notes.takePhoto')}`));
    expect(pickPhoto).toHaveBeenCalledWith('camera');
    expect(await screen.findByLabelText(tr('notes.photo'))).toBeTruthy();
    await fireEvent.press(screen.getByText(tr('notes.removePhoto')));
    expect(screen.queryByLabelText(tr('notes.photo'))).toBeNull();
    await fireEvent.press(screen.getByText(`🖼 ${tr('notes.choosePhoto')}`));
    expect(pickPhoto).toHaveBeenLastCalledWith('library');
    await screen.findByLabelText(tr('notes.photo'));
    await fireEvent.press(screen.getByText(tr('notes.save')));
    expect(onAdd).toHaveBeenCalledWith(expect.any(String), 'Two at the feeder', 'file:///cache/p.jpg');
  });

  it('shows a saved note photo, and offers no photo buttons without a picker', async () => {
    await render(
      <FieldNotes
        locale="en"
        notes={[{ id: 'a', speciesId: 'owl', date: '2026-11-03', text: 'Saw two', photo: 'a.jpg' }]}
        onAdd={() => true}
        photoUri={(n) => `file:///doc/notes/${n}`}
      />,
    );
    expect(screen.getByLabelText(tr('notes.photo')).props.source).toEqual({ uri: 'file:///doc/notes/a.jpg' });
    await fireEvent.press(screen.getByText(`✎ ${tr('notes.add')}`));
    expect(screen.queryByText(`📷 ${tr('notes.takePhoto')}`)).toBeNull();
  });
});
