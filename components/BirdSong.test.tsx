import { act, fireEvent, render, screen } from '@testing-library/react-native';
import * as Audio from 'expo-audio';
import { Linking } from 'react-native';
import BirdSong from './BirdSong';
import type { SoundSource, SpeciesSound } from '../lib/birdSound';
import { createTranslator } from '../lib/i18n';

const players = (Audio as unknown as { __players: Record<string, any>[] }).__players;
const tr = createTranslator('sv');
const sound: SpeciesSound = {
  speciesId: 'gbif:1',
  url: 'https://x/sounds/gbif-1.m4a',
  license: 'CC-BY',
  author: 'E. A.',
  sourceUrl: 'https://www.inaturalist.org/observations/2',
};
const sourceWith = (s: SpeciesSound | undefined): SoundSource => ({ soundFor: jest.fn(async () => s) });
const playLabel = `🐦 ${tr('card.song')}`;
const stopLabel = `⏹ ${tr('card.listenStop')}`;

afterEach(() => {
  players.length = 0;
  jest.clearAllMocks();
});

// T-246: hear the bird's song on its card.
describe('BirdSong', () => {
  it('shows nothing for a bird without a recording', async () => {
    await render(<BirdSong speciesId="gbif:9" locale="sv" source={sourceWith(undefined)} />);
    expect(screen.queryByText(playLabel)).toBeNull();
  });

  it('plays the clip and shows its credit', async () => {
    await render(<BirdSong speciesId="gbif:1" locale="sv" source={sourceWith(sound)} />);
    await fireEvent.press(await screen.findByText(playLabel));
    expect(players[0].source).toEqual({ uri: sound.url });
    expect(players[0].play).toHaveBeenCalled();
    expect(screen.getByText(stopLabel)).toBeTruthy();
    expect(screen.getByText('Inspelning: E. A. · CC-BY · via iNaturalist · förkortad')).toBeTruthy();
  });

  it('stops when tapped again, and rewinds a finished clip before replaying', async () => {
    await render(<BirdSong speciesId="gbif:1" locale="sv" source={sourceWith(sound)} />);
    await fireEvent.press(await screen.findByText(playLabel));
    await fireEvent.press(screen.getByText(stopLabel));
    expect(players[0].pause).toHaveBeenCalled();

    await fireEvent.press(screen.getByText(playLabel));
    await act(async () => {
      players[0].playing = false;
      players[0].didJustFinish = true;
      players[0]._emit();
    });
    await fireEvent.press(screen.getByText(playLabel));
    expect(players[0].seekTo).toHaveBeenCalledWith(0);
  });

  it('opens the recording page from the credit', async () => {
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    await render(<BirdSong speciesId="gbif:1" locale="sv" source={sourceWith(sound)} />);
    await fireEvent.press(await screen.findByText(/^Inspelning/));
    expect(open).toHaveBeenCalledWith(sound.sourceUrl);
  });
});
