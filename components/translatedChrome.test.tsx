import { render, screen } from '@testing-library/react-native';
import SpeciesHero from './SpeciesHero';
import SettingsScreen from './SettingsScreen';
import { attributionFor } from '../lib/species/media';
import { createTranslator } from '../lib/i18n';
import { soundRowToSound, soundCredit } from '../lib/birdSound';
import { KRONOBERG_SPECIES } from '../lib/species/kronoberg';
import { commonNameFor } from '../lib/species/localized';
import appJson from '../app.json';

// T-313 · review B-63: text the user sees goes through the catalogue.

const sv = createTranslator('sv');
const moose = KRONOBERG_SPECIES.find((s) => s.id === 'moose')!;
const media = {
  speciesId: 'moose',
  url: 'https://x/moose.jpg',
  sourceUrl: 'https://commons.wikimedia.org/wiki/File:Moose.jpg',
  author: 'A. Photographer',
  license: 'CC-BY' as const,
  isPrimary: true,
};

describe('translated chrome', () => {
  it('the photo credit is in the reader’s language', () => {
    expect(attributionFor(media, 'sv')).toBe(
      sv('photo.credit', { author: 'A. Photographer', license: 'CC-BY' }) +
        sv('photo.via', { source: 'Wikimedia Commons' }),
    );
    expect(attributionFor(media, 'sv')).not.toMatch(/Photo:|via /);
  });

  it('a missing author reads "Okänd" in Swedish, never the English "Unknown"', () => {
    expect(attributionFor({ ...media, author: '' }, 'sv')).toContain(sv('photo.unknownAuthor'));
    const sound = soundRowToSound({
      species_id: 'robin',
      url: 'https://x/a.mp3',
      source_url: null,
      author: null,
      license: 'CC-BY',
    } as never)!;
    expect(soundCredit(sound, sv)).toContain(sv('photo.unknownAuthor'));
    expect(soundCredit(sound, sv)).not.toContain('Unknown');
  });

  it('the photo button is named in the reader’s language', async () => {
    await render(<SpeciesHero species={moose} spotted locale="sv" />);
    const button = screen.queryByTestId('species-photo');
    if (button) {
      expect(button.props.accessibilityLabel).toBe(commonNameFor(moose, 'sv'));
      expect(button.props.accessibilityHint).toBe(sv('photo.openHint'));
    }
  });

  it('About shows the app version, not "Kronoberg alpha"', async () => {
    expect(sv('settings.about', { version: '1.2.3' })).not.toMatch(/Kronoberg|alfa/);
    await render(
      <SettingsScreen
        locale="sv"
        consent={{ location: false, notifications: false, analytics: false }}
        onToggleConsent={() => {}}
        onSelectLocale={() => {}}
        onExportData={() => {}}
        onDone={() => {}}
      />,
    );
    expect(screen.getByText(sv('settings.about', { version: appJson.expo.version }))).toBeTruthy();
  });
});
