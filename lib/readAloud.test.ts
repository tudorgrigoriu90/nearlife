import { cardSpeech, hasVoiceFor, speechLanguage } from './readAloud';

// T-244: read the species card aloud with the phone's own voice (expo-speech): offline, free, and
// for people learning Swedish a way to hear how the names are said.
describe('cardSpeech', () => {
  it('reads the name, then each text that exists, as separate sentences', () => {
    expect(
      cardSpeech('Nötväcka', {
        fact: 'Den klättrar nedåt.',
        whenAndHow: 'Året runt',
        give: 'Sätt upp en holk',
        protect: '',
      }),
    ).toBe('Nötväcka. Den klättrar nedåt. Året runt. Sätt upp en holk.');
  });

  it('reads just the name when there is no text', () => {
    expect(cardSpeech('Älg', null)).toBe('Älg.');
  });
});

describe('speechLanguage', () => {
  it('gives the voice tag for each app language, regional where it matters', () => {
    expect(speechLanguage('sv')).toBe('sv-SE');
    expect(speechLanguage('en')).toBe('en-GB');
    expect(speechLanguage('pt')).toBe('pt-PT');
    expect(speechLanguage('ro')).toBe('ro');
    expect(speechLanguage('kmr')).toBe('ku'); // Kurmanji voices are tagged "ku"
  });
});

describe('hasVoiceFor', () => {
  const voices = [{ language: 'sv-SE' }, { language: 'en-GB' }, { language: 'ro_RO' }];

  it('finds a voice by language, whatever the region or separator', () => {
    expect(hasVoiceFor(voices, 'sv')).toBe(true);
    expect(hasVoiceFor(voices, 'ro')).toBe(true);
    expect(hasVoiceFor(voices, 'so')).toBe(false);
  });

  it('does not offer a language the phone cannot speak, so it is never read in the wrong voice', () => {
    expect(hasVoiceFor([], 'ar')).toBe(false);
  });
});
