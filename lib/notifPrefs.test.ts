import { allowedHours } from './sendSlot';
import {
  DEFAULT_NOTIF_PREFS,
  MIN_INTERVAL_HOURS,
  WINDOW_HOURS,
  hoursFor,
  parseNotifPrefs,
  groupOfRow,
  toggleGroup,
  prefGroupOf,
} from './notifPrefs';

// T-341 · review F-03: notification choices.
describe('notification choices', () => {
  it('defaults to today’s behaviour: daily, any waking hour, every group', () => {
    expect(DEFAULT_NOTIF_PREFS).toEqual({ frequency: 'daily', window: null, groups: null });
    expect(MIN_INTERVAL_HOURS.daily).toBe(20);
    expect(hoursFor(DEFAULT_NOTIF_PREFS)).toEqual(allowedHours());
  });

  it('reads only what it knows, so a bad stored value falls back rather than breaking sends', () => {
    expect(parseNotifPrefs({ frequency: 'weekly', window: 'evening', groups: ['bird', 'plant'] })).toEqual({
      frequency: 'weekly',
      window: 'evening',
      groups: ['bird', 'plant'],
    });
    expect(parseNotifPrefs({ frequency: 'hourly', window: 'night', groups: ['dragon'] })).toEqual(DEFAULT_NOTIF_PREFS);
    expect(parseNotifPrefs(null)).toEqual(DEFAULT_NOTIF_PREFS);
    expect(parseNotifPrefs({ groups: [] })).toEqual(DEFAULT_NOTIF_PREFS); // no group at all would mean never
  });

  it('keeps a window inside waking hours, so quiet hours 21–08 stay fixed', () => {
    expect(hoursFor({ ...DEFAULT_NOTIF_PREFS, window: 'morning' })).toEqual([8, 9, 10]);
    expect(hoursFor({ ...DEFAULT_NOTIF_PREFS, window: 'evening' })).toEqual([15, 16, 17, 18, 19, 20]);
    for (const hours of Object.values(WINDOW_HOURS)) for (const h of hours) expect(allowedHours()).toContain(h);
  });

  it('spaces sends by the chosen frequency', () => {
    expect(MIN_INTERVAL_HOURS).toEqual({ daily: 20, everyOtherDay: 44, weekly: 164 });
  });

  it('files every species group under one of the six choices; fish has its own (T-389)', () => {
    expect(prefGroupOf('fish')).toBe('fish');
    expect(prefGroupOf('bird')).toBe('bird');
    expect(prefGroupOf('fungus')).toBe('other');
    expect(prefGroupOf('amphibian')).toBe('other');
    expect(prefGroupOf('plant')).toBe('plant');
  });
});

describe('groupOfRow', () => {
  it('derives the group the way the app does', () => {
    const { speciesRowToSpecies } = jest.requireActual('./speciesRepository');
    const { groupOf } = jest.requireActual('./species/group');
    for (const [category, taxon_group] of [['bird', null], [null, 'amphibian'], [null, 'mollusc'], [null, null], ['fungus', 'fungus']] as const) {
      const row = { id: 'x', scientific_name: 'X', common_name: null, category, rarity: 'common', active_months: [1], taxon_group };
      expect(groupOfRow(category, taxon_group)).toBe(groupOf(speciesRowToSpecies(row)));
    }
  });
});

describe('toggleGroup', () => {
  const all = { frequency: 'daily' as const, window: null, groups: null };
  it('turning one off from "all" keeps the other five', () => {
    expect(toggleGroup(all, 'plant').groups).toEqual(['bird', 'mammal', 'fish', 'insect', 'other']);
  });
  it('turning the last missing one back on is "all" again', () => {
    expect(toggleGroup(toggleGroup(all, 'plant'), 'plant').groups).toBeNull();
  });
  it('never turns off the last group: that would be "never", which is the consent switch', () => {
    const one = { ...all, groups: ['bird' as const] };
    expect(toggleGroup(one, 'bird')).toBe(one);
  });
});

// T-389: the one-time carry-over of "other" to fish is in migration 0053, not here: done on every
// read, it would turn fish back on for someone who later switched it off.
describe('fish is a choice of its own', () => {
  it('is read like any other group', () => {
    expect(parseNotifPrefs({ groups: ['bird', 'other'] }).groups).toEqual(['bird', 'other']);
    expect(parseNotifPrefs({ groups: ['fish'] }).groups).toEqual(['fish']);
  });
});
