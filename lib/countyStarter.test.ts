import { pickCountyStarter } from './countyStarter';

// T-275 · review B-16: the onboarding first sighting is the county's most recorded species this
// month that has a photo and a name.
const photo = { url: 'https://x/p.jpg', sourceUrl: 's', author: 'a', license: 'CC-BY' };
const presence = [
  { speciesId: 'a', activeMonths: [6], occurrences: 900, monthCounts: [0, 0, 0, 0, 0, 50, 0, 0, 0, 0, 0, 0] },
  { speciesId: 'b', activeMonths: [6], occurrences: 100, monthCounts: [0, 0, 0, 0, 0, 80, 0, 0, 0, 0, 0, 0] },
  { speciesId: 'c', activeMonths: [6], occurrences: 50, monthCounts: [0, 0, 0, 0, 0, 70, 0, 0, 0, 0, 0, 0] },
  { speciesId: 'winter', activeMonths: [1], occurrences: 5000 },
];

function describe_(withPhoto: string[], named: string[]) {
  return async (ids: string[]) =>
    ids.map((id) => ({
      species: { id, scientificName: `Sci ${id}`, ...(withPhoto.includes(id) ? { photo } : {}) } as never,
      commonName: named.includes(id) ? `Name ${id}` : `Sci ${id}`,
      detail: null,
    }));
}

describe('pickCountyStarter', () => {
  it('takes the most recorded species this month that has a photo and a name', async () => {
    const found = await pickCountyStarter(presence, 6, describe_(['a', 'c'], ['a', 'c']), async () => null);
    expect(found?.species.id).toBe('c'); // b has more June records but no photo; a fewer than c
  });

  it('none when nothing active this month has a photo and a name', async () => {
    expect(await pickCountyStarter(presence, 6, describe_([], []), async () => null)).toBeNull();
  });
});
