import {
  QUIZ_STORAGE_KEY,
  RECOGNIZED_STORAGE_KEY,
  AsyncStorageRecognitionStore,
  AsyncStorageQuizAttemptStore,
  canAttempt,
  findByExactName,
  pickLookalikes,
  quizOptions,
  recordAttempt,
} from './sightingQuiz';
import { photoFor } from './species/media';
import type { Species } from './species/types';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// T-241: "I saw…" — the user names what they saw exactly, then picks it out from lookalikes.
const photo = { url: 'u', sourceUrl: 's', license: 'CC-BY' as const, author: 'a', isPrimary: true };
const sp = (
  id: string,
  sci: string,
  en: string,
  sv: string,
  group: Species['category'],
  months: number[],
  withPhoto = true,
): Species =>
  ({
    id,
    scientificName: sci,
    commonName: en,
    category: group,
    rarity: 'common',
    activeMonths: months,
    names: { sv },
    ...(withPhoto
      ? { photo: { ...photo, speciesId: id, url: `u/${id}`, sourceUrl: `s/${id}` } }
      : {}),
  }) as Species;

const moose = sp(
  'moose',
  'Alces alces',
  'Moose',
  'Älg',
  'mammal',
  [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
);
const roe = sp('roe', 'Capreolus capreolus', 'Roe Deer', 'Rådjur', 'mammal', [5, 6]);
const red = sp('red', 'Cervus elaphus', 'Red Deer', 'Kronhjort', 'mammal', [5]);
const fallow = sp('fallow', 'Dama dama', 'Fallow Deer', 'Dovhjort', 'mammal', [10]);
const fox = sp('fox', 'Vulpes vulpes', 'Red Fox', 'Rödräv', 'mammal', [5], false);
const tit = sp('tit', 'Parus major', 'Great Tit', 'Talgoxe', 'bird', [5]);
const blueTit = sp('bluetit', 'Cyanistes caeruleus', 'Blue Tit', 'Blåmes', 'bird', [5]);
const coalTit = sp('coaltit', 'Periparus ater', 'Coal Tit', 'Svartmes', 'bird', [5]);
const crested = sp('crested', 'Lophophanes cristatus', 'Crested Tit', 'Tofsmes', 'bird', [5]);
const willow = sp('willow', 'Poecile montanus', 'Willow Tit', 'Talltita', 'bird', [5]);
const marsh = sp('marsh', 'Poecile palustris', 'Marsh Tit', 'Entita', 'bird', [5]);
const county = [moose, roe, red, fallow, fox, tit, blueTit, coalTit, crested, willow, marsh];

describe('findByExactName', () => {
  it('finds a species by its exact local, English or Latin name, ignoring case and accents', () => {
    expect(findByExactName(county, 'älg', 'sv').map((s) => s.id)).toEqual(['moose']);
    expect(findByExactName(county, 'ALG', 'sv').map((s) => s.id)).toEqual(['moose']);
    expect(findByExactName(county, 'Moose', 'sv').map((s) => s.id)).toEqual(['moose']);
    expect(findByExactName(county, ' alces alces ', 'sv').map((s) => s.id)).toEqual(['moose']);
  });

  it('wants the exact name: a part or a broad word finds nothing (Director, 2026-11-05)', () => {
    expect(findByExactName(county, 'äl', 'sv')).toEqual([]);
    expect(findByExactName(county, 'fågel', 'sv')).toEqual([]);
    expect(findByExactName(county, '', 'sv')).toEqual([]);
  });
});

describe('pickLookalikes', () => {
  it('prefers the same genus, then the same group active the same month, and only species with a photo', () => {
    const picks = pickLookalikes(willow, county, 5, 3, 'seed');
    expect(picks).toHaveLength(3);
    expect(picks[0].id).toBe('marsh'); // same genus Poecile
    for (const p of picks) {
      expect(p.category).toBe('bird');
      expect(p.photo).toBeDefined();
      expect(p.id).not.toBe('willow');
    }
  });

  it('falls back to the same group out of season, never to a species without a photo', () => {
    const picks = pickLookalikes(moose, county, 5, 3, 'seed').map((p) => p.id);
    expect(picks).toHaveLength(3);
    expect(picks).not.toContain('fox'); // no photo
    expect(picks.slice(0, 2).sort()).toEqual(['red', 'roe']); // active in May first
    expect(picks[2]).toBe('fallow');
  });

  it('never shows the same picture twice: a species sharing the answer’s photo is left out (T-253)', () => {
    // Alces americanus has Wikipedia's Alces alces photo; it appeared as a "wrong" moose.
    const sameFile = (s: Species, of: Species): Species => ({
      ...s,
      photo: { ...s.photo!, url: `u/${s.id}`, sourceUrl: photoFor(of)!.sourceUrl },
    });
    const americanMoose = sameFile(
      sp('amoose', 'Alces americanus', 'American Moose', 'Amerikansk älg', 'mammal', [5]),
      moose,
    );
    const roeTwin = sameFile(
      sp('roe2', 'Capreolus pygargus', 'Siberian Roe', 'Sibiriskt rådjur', 'mammal', [5]),
      roe,
    );
    const picks = pickLookalikes(moose, [...county, americanMoose, roeTwin], 5, 3, 'seed');
    expect(picks.map((p) => p.id)).not.toContain('amoose');
    const files = [moose, ...picks].map((p) => photoFor(p)!.sourceUrl);
    expect(new Set(files).size).toBe(4);
  });

  it('is stable for the same seed, so a reopened quiz shows the same choices', () => {
    expect(pickLookalikes(tit, county, 5, 3, 'a')).toEqual(pickLookalikes(tit, county, 5, 3, 'a'));
  });
});

describe('quizOptions', () => {
  it('mixes the answer in with the lookalikes, each once', () => {
    const opts = quizOptions(tit, [blueTit, coalTit, crested], 'seed');
    expect(opts.map((o) => o.id).sort()).toEqual(['bluetit', 'coaltit', 'crested', 'tit']);
  });
});

describe('one try per species per day (Director, 2026-11-05)', () => {
  it('allows the first try of the day and blocks a second for that species only', () => {
    let attempts = {};
    expect(canAttempt(attempts, 'moose', '2026-11-05')).toBe(true);
    attempts = recordAttempt(attempts, 'moose', '2026-11-05');
    expect(canAttempt(attempts, 'moose', '2026-11-05')).toBe(false);
    expect(canAttempt(attempts, 'roe', '2026-11-05')).toBe(true);
    expect(canAttempt(attempts, 'moose', '2026-11-06')).toBe(true);
  });

  it('forgets earlier days when recording, so the store never grows', () => {
    const attempts = recordAttempt({ old: '2026-11-01', moose: '2026-11-04' }, 'roe', '2026-11-05');
    expect(attempts).toEqual({ roe: '2026-11-05' });
  });

  it('persists on the device and survives a corrupt value', async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    const store = new AsyncStorageQuizAttemptStore();
    await store.save({ moose: '2026-11-05' });
    expect(await store.load()).toEqual({ moose: '2026-11-05' });
    await AsyncStorage.setItem(QUIZ_STORAGE_KEY, 'not json');
    expect(await store.load()).toEqual({});
  });
});

describe('recognised species, kept on the device for the badges (T-243)', () => {
  it('persists the set, survives a corrupt value, and clears on account deletion', async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    const store = new AsyncStorageRecognitionStore();
    await store.save(new Set(['moose', 'tit']));
    expect([...(await store.load())].sort()).toEqual(['moose', 'tit']);
    await AsyncStorage.setItem(RECOGNIZED_STORAGE_KEY, '{oops');
    expect((await store.load()).size).toBe(0);
    await store.save(new Set(['moose']));
    await store.clear();
    expect((await store.load()).size).toBe(0);
  });

  it('the daily-try record clears too', async () => {
    const store = new AsyncStorageQuizAttemptStore();
    await store.save({ moose: '2026-11-05' });
    await store.clear();
    expect(await store.load()).toEqual({});
  });
});
