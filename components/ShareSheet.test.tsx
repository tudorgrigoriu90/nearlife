import { fireEvent, render, screen } from '@testing-library/react-native';
import { Share } from 'react-native';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import ShareSheet from './ShareSheet';
import { createTranslator } from '../lib/i18n';
import type { Species } from '../lib/species/types';

// T-368 · review F-14.
const tr = createTranslator('en');
const photo = { speciesId: 'owl', url: 'https://x/owl.jpg', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Owl.jpg', license: 'CC-BY-4.0', author: 'A. Photographer', isPrimary: true };
const owl = { id: 'owl', scientificName: 'Strix aluco', commonName: 'Tawny Owl', category: 'bird', rarity: 'common', activeMonths: [1], photo } as unknown as Species;

beforeEach(() => jest.clearAllMocks());

describe('ShareSheet', () => {
  it('draws the photo credit on the image it shares', async () => {
    await render(<ShareSheet species={owl} locale="en" county="Kronoberg" visible onClose={() => undefined} />);
    const card = screen.getByTestId('share-card');
    expect(screen.getByText(/A\. Photographer/)).toBeTruthy();
    expect(screen.getByText(tr('share.card.season', { county: 'Kronoberg' }))).toBeTruthy();
    await fireEvent.press(screen.getByText(tr('share.image')));
    expect(captureRef).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ format: 'png' }));
    expect(Sharing.shareAsync).toHaveBeenCalledWith('file:///tmp/nearby-card.png', expect.objectContaining({ mimeType: 'image/png' }));
    expect(card).toBeTruthy();
  });

  it('shares the text when asked, and falls back to it when the phone cannot share files', async () => {
    const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });
    await render(<ShareSheet species={owl} locale="en" county={null} visible onClose={() => undefined} />);
    await fireEvent.press(screen.getByText(tr('share.text')));
    expect(share).toHaveBeenCalledTimes(1);

    (Sharing.isAvailableAsync as jest.Mock).mockResolvedValueOnce(false);
    await fireEvent.press(screen.getByText(tr('share.image')));
    expect(Sharing.shareAsync).not.toHaveBeenCalled();
    expect(share).toHaveBeenCalledTimes(2);
    share.mockRestore();
  });
});
