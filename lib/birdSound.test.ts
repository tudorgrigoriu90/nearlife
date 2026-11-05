import {
  cachedSoundSource,
  soundCredit,
  soundRowToSound,
  supabaseSoundSource,
  type SoundRow,
} from './birdSound';
import { createTranslator } from './i18n';

const row: SoundRow = {
  species_id: 'gbif:1',
  url: 'https://x.supabase.co/storage/v1/object/public/species-media/sounds/gbif-1.m4a',
  source_url: 'https://www.inaturalist.org/observations/2',
  author: 'E. A.',
  license: 'CC-BY',
};

// T-246: a bird's clip from species_sounds (T-245), with the credit its licence asks for.
describe('soundRowToSound', () => {
  it('turns a row into a playable sound', () => {
    expect(soundRowToSound(row)).toEqual({
      speciesId: 'gbif:1',
      url: row.url,
      license: 'CC-BY',
      author: 'E. A.',
      sourceUrl: row.source_url,
    });
  });

  it('never ships a recorded miss or a licence outside the allowed set', () => {
    expect(soundRowToSound({ ...row, url: null, license: null })).toBeUndefined();
    expect(soundRowToSound({ ...row, license: 'CC-BY-NC' })).toBeUndefined();
  });

  it('credits an unknown recordist rather than dropping the credit', () => {
    expect(soundRowToSound({ ...row, author: null })?.author).toBe('Unknown');
  });
});

describe('soundCredit', () => {
  it('names the recordist, the licence, the source and that the clip is shortened', () => {
    const sound = soundRowToSound(row)!;
    expect(soundCredit(sound, createTranslator('en'))).toBe(
      'Recording: E. A. · CC-BY · via iNaturalist · shortened',
    );
    expect(soundCredit(sound, createTranslator('sv'))).toBe(
      'Inspelning: E. A. · CC-BY · via iNaturalist · förkortad',
    );
  });
});

describe('cachedSoundSource', () => {
  it('asks once per species, misses included, and never throws', async () => {
    const fetch = jest
      .fn()
      .mockResolvedValueOnce(row)
      .mockResolvedValueOnce(null)
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(row);
    const source = cachedSoundSource(fetch);
    expect((await source.soundFor('gbif:1'))?.url).toBe(row.url);
    expect(await source.soundFor('gbif:1')).toBeDefined();
    expect(await source.soundFor('gbif:2')).toBeUndefined();
    expect(await source.soundFor('gbif:2')).toBeUndefined();
    expect(fetch).toHaveBeenCalledTimes(2);
    // A failed fetch is not remembered: offline now may be online on the next card.
    expect(await source.soundFor('gbif:3')).toBeUndefined();
    expect((await source.soundFor('gbif:3'))?.url).toBe(row.url);
  });
});

describe('supabaseSoundSource', () => {
  const clientWith = (result: { data: SoundRow | null; error: unknown }) => {
    const maybeSingle = jest.fn(async () => result);
    const eq = jest.fn(() => ({ maybeSingle }));
    const select = jest.fn(() => ({ eq }));
    const from = jest.fn(() => ({ select }));
    return { client: { from }, from, select, eq };
  };

  it('reads the one row for the species from species_sounds', async () => {
    const fake = clientWith({ data: row, error: null });
    const sound = await supabaseSoundSource(fake.client).soundFor('gbif:1');
    expect(fake.from).toHaveBeenCalledWith('species_sounds');
    expect(fake.eq).toHaveBeenCalledWith('species_id', 'gbif:1');
    expect(sound?.url).toBe(row.url);
  });

  it('treats an error as "not now", not as "no recording"', async () => {
    const fake = clientWith({ data: null, error: new Error('down') });
    expect(await supabaseSoundSource(fake.client).soundFor('gbif:1')).toBeUndefined();
  });
});
