import { fireEvent, render, screen } from '@testing-library/react-native';
import * as Speech from 'expo-speech';
import ReadAloud from './ReadAloud';
import { createTranslator } from '../lib/i18n';

jest.mock('expo-speech', () => ({
  speak: jest.fn(),
  stop: jest.fn(async () => undefined),
  getAvailableVoicesAsync: jest.fn(async () => [{ language: 'sv-SE' }, { language: 'ro-RO' }]),
}));
const mocked = jest.mocked(Speech);
const tr = createTranslator('sv');
const content = {
  speciesId: 'x',
  fact: 'Den klättrar nedåt.',
  whenAndHow: 'Året runt.',
  give: 'Holk.',
  protect: 'Katt inne.',
};

afterEach(() => jest.clearAllMocks());

// T-244: read the card aloud in the app language, and in the second language if the phone can.
describe('ReadAloud', () => {
  it('reads the card in the app language with the matching voice', async () => {
    await render(<ReadAloud locale="sv" name="Nötväcka" content={content} />);
    await fireEvent.press(screen.getByText(`🔊 ${tr('card.listen')}`));
    expect(mocked.speak).toHaveBeenCalledWith(
      'Nötväcka. Den klättrar nedåt. Året runt. Holk. Katt inne.',
      expect.objectContaining({ language: 'sv-SE' }),
    );
    expect(screen.getByText(`⏹ ${tr('card.listenStop')}`)).toBeTruthy();
  });

  it('stops when tapped again', async () => {
    await render(<ReadAloud locale="sv" name="Nötväcka" content={content} />);
    await fireEvent.press(screen.getByText(`🔊 ${tr('card.listen')}`));
    await fireEvent.press(screen.getByText(`⏹ ${tr('card.listenStop')}`));
    expect(mocked.stop).toHaveBeenCalled();
    expect(screen.getByText(`🔊 ${tr('card.listen')}`)).toBeTruthy();
  });

  it('offers the second language only when the phone has a voice for it', async () => {
    await render(
      <ReadAloud
        locale="sv"
        name="Nötväcka"
        content={content}
        secondary={{ locale: 'ro', name: 'Țicleanul', content }}
      />,
    );
    await fireEvent.press(await screen.findByText('🔊 Română'));
    expect(mocked.speak).toHaveBeenLastCalledWith(
      expect.stringMatching(/^Țicleanul\./),
      expect.objectContaining({ language: 'ro' }),
    );
  });

  it('hides the second language the phone cannot speak', async () => {
    await render(
      <ReadAloud
        locale="sv"
        name="Nötväcka"
        content={content}
        secondary={{ locale: 'so', name: 'X', content }}
      />,
    );
    await screen.findByText(`🔊 ${tr('card.listen')}`);
    expect(screen.queryByText(/Soomaali/)).toBeNull();
  });

  it('stops speaking when the card closes', async () => {
    const { unmount } = await render(<ReadAloud locale="sv" name="Nötväcka" content={content} />);
    await unmount();
    expect(mocked.stop).toHaveBeenCalled();
  });
});
