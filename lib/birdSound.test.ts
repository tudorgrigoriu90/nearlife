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
    const not = jest.fn(async () => ({ data: result.data ? [result.data] : [], error: result.error }));
    const inFn = jest.fn(() => ({ not }));
    const select = jest.fn(() => ({ eq, in: inFn }));
    const from = jest.fn(() => ({ select }));
    return { client: { from }, from, select, eq, inFn };
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

describe('withSound (T-247)', () => {
  it('lists the birds with a playable recording and caches them for the card', async () => {
    const fetchRow = jest.fn();
    const source = cachedSoundSource(fetchRow, async () => [
      row,
      { ...row, species_id: 'gbif:nc', license: 'CC-BY-NC' },
    ]);
    expect(await source.withSound(['gbif:1', 'gbif:nc', 'gbif:9'])).toEqual(new Set(['gbif:1']));
    expect((await source.soundFor('gbif:1'))?.url).toBe(row.url);
    expect(fetchRow).not.toHaveBeenCalled();
  });

  it('answers empty when the read fails', async () => {
    const source = cachedSoundSource(jest.fn(), async () => {
      throw new Error('offline');
    });
    expect(await source.withSound(['gbif:1'])).toEqual(new Set());
  });

  it('reads Supabase in chunks, recordings only', async () => {
    const not = jest.fn(async () => ({ data: [row], error: null }));
    const inFn = jest.fn((_column: string, _ids: string[]) => ({ not }));
    const client = { from: jest.fn(() => ({ select: jest.fn(() => ({ eq: jest.fn(), in: inFn })) })) };
    const ids = Array.from({ length: 150 }, (_, i) => `gbif:${i}`);
    expect(await supabaseSoundSource(client as never).withSound(ids)).toEqual(new Set(['gbif:1']));
    expect(inFn).toHaveBeenCalledTimes(2);
    expect(inFn.mock.calls[0][1]).toHaveLength(100);
    expect(not).toHaveBeenCalledWith('url', 'is', null);
  });
});
