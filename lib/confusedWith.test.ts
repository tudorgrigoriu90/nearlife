import { CONFUSED_WITH_MAX, confusedWith } from './confusedWith';
import type { Species } from './species/types';

// T-352 · review F-13: "Often confused with" on the card.
const sp = (id: string, sci: string, occurrences: number, photo: string | null = `s/${id}`): Species =>
  ({
    id,
    scientificName: sci,
    commonName: id,
    category: 'bird',
    rarity: 'common',
    activeMonths: [5],
    county: { occurrences, monthCounts: null },
    ...(photo ? { photo: { speciesId: id, url: `u/${id}`, sourceUrl: photo, license: 'CC-BY', author: 'a', isPrimary: true } } : {}),
  }) as Species;

describe('confusedWith', () => {
  const great = sp('tit-x', 'Parus major', 900);
  it('lists same-genus species with a photo, the commonest in the county first, at most three', () => {
    const pool = [
      great,
      sp('a', 'Parus a', 10),
      sp('b', 'Parus b', 500),
      sp('c', 'Parus c', 50),
      sp('d', 'Parus d', 5),
      sp('robin', 'Erithacus rubecula', 2000), // another genus: not a lookalike here
    ];
    expect(CONFUSED_WITH_MAX).toBe(3);
    expect(confusedWith(great, pool).map((s) => s.id)).toEqual(['b', 'c', 'a']);
  });

  it('leaves out species with no photo, and never shows the same picture twice', () => {
    const pool = [
      great,
      sp('nophoto', 'Parus x', 999, null),
      sp('same-as-target', 'Parus y', 800, 's/tit-x'),
      sp('twin1', 'Parus z', 700, 's/shared'),
      sp('twin2', 'Parus w', 600, 's/shared'),
    ];
    expect(confusedWith(great, pool).map((s) => s.id)).toEqual(['twin1']);
  });

  it('is empty when the genus has no other member in the county', () => {
    expect(confusedWith(great, [great, sp('robin', 'Erithacus rubecula', 1)])).toEqual([]);
  });
});

// T-385: a genus name can be used twice across kingdoms. Linaria is the twite and linnet's genus
// and the toadflaxes'; the twite's card showed two toadflaxes as lookalikes.
describe('a genus name shared by a bird and a plant', () => {
  it('lists only lookalikes of the same group', () => {
    const twite = sp('twite', 'Linaria flavirostris', 50);
    const linnet = sp('linnet', 'Linaria cannabina', 400);
    const toadflax = { ...sp('toadflax', 'Linaria vulgaris', 900), category: 'plant' } as Species;
    expect(confusedWith(twite, [toadflax, linnet]).map((s) => s.id)).toEqual(['linnet']);
    expect(confusedWith(toadflax, [twite, linnet])).toEqual([]);
  });
});
