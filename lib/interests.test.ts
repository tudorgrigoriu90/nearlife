import { eventShown, hiddenIds, parseInterests, shows, toggleInterest } from './interests';
import type { Species } from './species/types';

// T-390: one "Show me" choice for the whole app (This Week, its strips and events, the calendar,
// notifications). The Almanac is the user's collection and is never filtered.
const sp = (id: string, category: Species['category'], scientificName = id, group?: Species['group']) =>
  ({ id, scientificName, commonName: id, category, rarity: 'common', activeMonths: [5], ...(group ? { group } : {}) }) as Species;

describe('interests', () => {
  it('everything by default, and a stored value read leniently', () => {
    expect(parseInterests(null)).toBeNull();
    expect(parseInterests('not json')).toBeNull();
    expect(parseInterests('["bird","dragon","fish","bird"]')).toEqual(['bird', 'fish']);
    expect(parseInterests('[]')).toBeNull();
  });

  it('shows a species of a chosen group; "other" covers frogs, snails and spiders', () => {
    expect(shows(null, sp('a', 'insect'))).toBe(true);
    expect(shows(['bird'], sp('a', 'bird'))).toBe(true);
    expect(shows(['bird'], sp('a', 'insect'))).toBe(false);
    expect(shows(['other'], sp('frog', 'insect', 'Rana', 'amphibian'))).toBe(true);
    expect(shows(['fish'], sp('pike', 'fish'))).toBe(true);
  });

  it('toggles like the notification groups: all on is null, the last one stays', () => {
    expect(toggleInterest(null, 'plant')).toEqual(['bird', 'mammal', 'fish', 'insect', 'other']);
    expect(toggleInterest(['bird', 'mammal', 'fish', 'insect', 'other'], 'plant')).toBeNull();
    expect(toggleInterest(['bird'], 'bird')).toEqual(['bird']);
  });

  it('lists the hidden species by id; nothing when everything is shown', () => {
    const pool = [sp('tit', 'bird'), sp('fox', 'mammal'), sp('pike', 'fish')];
    expect(hiddenIds(null, pool)).toBeNull();
    expect([...hiddenIds(['bird', 'fish'], pool)!]).toEqual(['fox']);
  });

  it('keeps a seasonal event only when its species or group is chosen', () => {
    const pool = [sp('crane', 'bird', 'Grus grus')];
    expect(eventShown(null, 'salmon-run', pool)).toBe(true);
    expect(eventShown(['bird'], 'crane-gathering', pool)).toBe(true);
    expect(eventShown(['plant'], 'crane-gathering', pool)).toBe(false);
    expect(eventShown(['other'], 'mushroom-season', pool)).toBe(true); // fungi file under "other"
    expect(eventShown(['bird'], 'mushroom-season', pool)).toBe(false);
  });
});
