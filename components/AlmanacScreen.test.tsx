import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import AlmanacScreen from './AlmanacScreen';
import { KRONOBERG_SPECIES } from '../lib/species/kronoberg';
import { createTranslator } from '../lib/i18n';
import type { Species } from '../lib/species/types';

const tr = createTranslator('en');

// One species per category — exercises the grid + every category chip without rendering all 54
// cells. The full-54 render was CPU-heavy and load-sensitive (it timed out even at 20s when the
// machine was saturated, T-147/T-161); a handful of real cells makes this test fast and stable.
// The full-set almanac logic (counts, filtering, discovery) is covered by lib/almanac.test.ts.
const ONE_PER_CATEGORY: Species[] = [
  ...new Map(KRONOBERG_SPECIES.map((s) => [s.category, s])).values(),
];
const RENDER_TIMEOUT = 15000; // headroom for a busy CI runner; the render itself is sub-second

describe('AlmanacScreen', () => {
  it('shows a loading state', async () => {
    await render(<AlmanacScreen species={[]} loading />);
    expect(screen.getByText(tr('almanac.loading'))).toBeTruthy();
  });

  it(
    'renders the grid with category filters',
    async () => {
      await render(<AlmanacScreen species={ONE_PER_CATEGORY} records={[]} />);
      expect(screen.getByText(tr('almanac.filter.all'))).toBeTruthy();
      // Every represented category yields a chip (e.g. "🐦 Birds") — grid + chip chrome is wired.
      // Regex (partial) match tolerates the emoji prefix on the chip label.
      expect(screen.getByText(new RegExp(tr('category.bird')))).toBeTruthy();
    },
    RENDER_TIMEOUT,
  );

  it(
    'opens the Badges and Impact screens from the header entry points (T-058)',
    async () => {
      const onOpenBadges = jest.fn();
      const onOpenImpact = jest.fn();
      await render(
        <AlmanacScreen
          species={ONE_PER_CATEGORY}
          records={[]}
          onOpenBadges={onOpenBadges}
          onOpenImpact={onOpenImpact}
        />,
      );
      // Labels carry an emoji prefix, so match partially.
      await fireEvent.press(screen.getByText(new RegExp(tr('nav.badges'))));
      await fireEvent.press(screen.getByText(new RegExp(tr('nav.impact'))));
      expect(onOpenBadges).toHaveBeenCalledTimes(1);
      expect(onOpenImpact).toHaveBeenCalledTimes(1);
    },
    RENDER_TIMEOUT,
  );

  it('keeps the filter row at its full height above the grid (T-239)', async () => {
    // On the Director's phone the chip labels were cut in half: the horizontal row sits in a column
    // with the grid, which takes all remaining height, and Android shrank the row to make room.
    await render(<AlmanacScreen species={ONE_PER_CATEGORY} records={[]} />);
    const row = screen.getByTestId('almanac-filters');
    expect(StyleSheet.flatten(row.props.style)).toMatchObject({ flexGrow: 0, flexShrink: 0 });
  });

  it('narrows the grid to a season (T-240)', async () => {
    const spring = {
      ...ONE_PER_CATEGORY[0],
      id: 'spring-sp',
      activeMonths: [4] as Species['activeMonths'],
    };
    const winter = {
      ...ONE_PER_CATEGORY[1],
      id: 'winter-sp',
      activeMonths: [1] as Species['activeMonths'],
    };
    const records = [spring, winter].map((x) => ({
      speciesId: x.id,
      spottedAt: '2026-01-01T00:00:00Z',
      caughtAt: null,
      helpedAt: null,
      helpedKind: null,
      primeBonus: false,
    }));
    await render(<AlmanacScreen species={[spring, winter]} records={records} />);
    await fireEvent.press(screen.getByText(`❄️ ${tr('almanac.season.winter')}`));
    expect(screen.getByText(winter.commonName)).toBeTruthy();
    expect(screen.queryByText(spring.commonName)).toBeNull();
  });

  it('searches spotted species by name, and says when nothing matches (T-240)', async () => {
    const [a, b] = ONE_PER_CATEGORY;
    const records = [
      {
        speciesId: a.id,
        spottedAt: '2026-01-01T00:00:00Z',
        caughtAt: null,
        helpedAt: null,
        helpedKind: null,
        primeBonus: false,
      },
    ];
    await render(<AlmanacScreen species={[a, b]} records={records} />);
    await fireEvent.changeText(
      screen.getByPlaceholderText(tr('almanac.search.placeholder')),
      a.scientificName,
    );
    expect(screen.getByText(a.commonName)).toBeTruthy();
    await fireEvent.changeText(
      screen.getByPlaceholderText(tr('almanac.search.placeholder')),
      b.scientificName,
    );
    expect(screen.getByText(tr('almanac.search.empty'))).toBeTruthy();
  });

  it('hides the entry points when no handlers are given', async () => {
    await render(<AlmanacScreen species={ONE_PER_CATEGORY} records={[]} />);
    expect(screen.queryByText(new RegExp(tr('nav.badges')))).toBeNull();
  });

  describe('grid photos (T-126)', () => {
    const swift = KRONOBERG_SPECIES.find((x) => x.id === 'common-swift')!;
    const spotted = {
      speciesId: swift.id,
      spottedAt: '2026-06-01T10:00:00Z',
      caughtAt: null,
      helpedAt: null,
      helpedKind: null,
      primeBonus: false,
    };

    it('shows the photo on a spotted cell', async () => {
      await render(<AlmanacScreen species={[swift]} records={[spotted]} />);
      expect(screen.getByTestId(`almanac-photo-${swift.id}`)).toBeTruthy();
    });

    it('keeps the silhouette until the species is spotted, so discovery still reveals it', async () => {
      await render(<AlmanacScreen species={[swift]} records={[]} />);
      expect(screen.queryByTestId(`almanac-photo-${swift.id}`)).toBeNull();
    });

    it('falls back to the category glyph when the photo fails to load', async () => {
      await render(<AlmanacScreen species={[swift]} records={[spotted]} />);
      await fireEvent(screen.getByTestId(`almanac-photo-${swift.id}`), 'error');
      expect(screen.queryByTestId(`almanac-photo-${swift.id}`)).toBeNull();
    });

    it('shows the glyph for a spotted species without a photo', async () => {
      const bare: Species = { ...swift, id: 'gbif:1', photo: undefined };
      await render(
        <AlmanacScreen species={[bare]} records={[{ ...spotted, speciesId: 'gbif:1' }]} />,
      );
      expect(screen.queryByTestId('almanac-photo-gbif:1')).toBeNull();
    });
  });

  describe('active-this-month filter (T-057)', () => {
    const swift = KRONOBERG_SPECIES.find((x) => x.id === 'common-swift')!;
    const summerOnly: Species = {
      ...swift,
      id: 'summer',
      commonName: 'Summer bird',
      activeMonths: [6, 7],
    };
    const winterOnly: Species = {
      ...swift,
      id: 'winter',
      commonName: 'Winter bird',
      activeMonths: [1],
    };

    it('shows only species active in the current month when switched on', async () => {
      await render(<AlmanacScreen species={[summerOnly, winterOnly]} month={1} />);
      expect(screen.getAllByText('—')).toHaveLength(2); // both undiscovered cells shown
      await fireEvent.press(screen.getByText(new RegExp(tr('almanac.filter.activeNow'))));
      expect(screen.getAllByText('—')).toHaveLength(1);
    });

    it('says so when nothing in the list is active this month', async () => {
      await render(<AlmanacScreen species={[summerOnly]} month={1} />);
      await fireEvent.press(screen.getByText(new RegExp(tr('almanac.filter.activeNow'))));
      expect(screen.getByText(tr('almanac.activeNow.empty'))).toBeTruthy();
    });

    it('marks the chip as selected for screen readers', async () => {
      await render(<AlmanacScreen species={[summerOnly]} month={1} />);
      const chip = screen.getByRole('button', { name: new RegExp(tr('almanac.filter.activeNow')) });
      await fireEvent.press(chip);
      expect(
        screen.getByRole('button', { name: new RegExp(tr('almanac.filter.activeNow')) }).props
          .accessibilityState,
      ).toEqual({ selected: true });
    });
  });

  it('filters to species of one habitat, and back (T-057)', async () => {
    const base = KRONOBERG_SPECIES[0];
    const species = [
      {
        ...base,
        id: 'pike',
        commonName: 'Pike',
        category: 'fish' as const,
        catchHabitats: ['freshwater' as const],
      },
      {
        ...base,
        id: 'hare',
        commonName: 'Hare',
        category: 'mammal' as const,
        catchHabitats: ['land' as const],
      },
    ];
    const records = [
      {
        speciesId: 'pike',
        spottedAt: 't',
        caughtAt: null,
        helpedAt: null,
        helpedKind: null,
        primeBonus: false,
      },
      {
        speciesId: 'hare',
        spottedAt: 't',
        caughtAt: null,
        helpedAt: null,
        helpedKind: null,
        primeBonus: false,
      },
    ];
    await render(<AlmanacScreen species={species} records={records} locale="en" />);
    const chip = () =>
      screen.getByRole('button', { name: new RegExp(tr('almanac.filter.freshwater')) });
    await fireEvent.press(chip());
    expect(screen.queryByText('Hare')).toBeNull();
    expect(screen.getByText('Pike')).toBeTruthy();
    expect(chip().props.accessibilityState).toEqual({ selected: true });
    await fireEvent.press(chip());
    expect(screen.getByText('Hare')).toBeTruthy();
  });
});

// T-275 · review B-14: a county that could not be loaded says so, with a retry.
describe('AlmanacScreen when the county could not be loaded', () => {
  it('shows the error and retries', async () => {
    const onRetry = jest.fn();
    await render(<AlmanacScreen species={[]} locale="en" error onRetry={onRetry} />);
    expect(screen.getByText(tr('thisWeek.loadError'))).toBeTruthy();
    await fireEvent.press(screen.getByText(tr('thisWeek.retry')));
    expect(onRetry).toHaveBeenCalled();
  });
});

// T-329 · review I-25: a screen reader says the tiers in words, never "black circle".
describe('AlmanacScreen cell names', () => {
  const robin = KRONOBERG_SPECIES.find((s) => s.id === 'european-robin')!;
  const record = (over: object) => ({
    speciesId: robin.id, spottedAt: '2026-06-01T10:00:00Z', caughtAt: null, helpedAt: null,
    helpedKind: null, primeBonus: false, ...over,
  });

  it('names the species and the tiers reached', async () => {
    await render(<AlmanacScreen species={[robin]} records={[record({ caughtAt: '2026-06-02T10:00:00Z' })]} />);
    expect(screen.getByLabelText(`European Robin, ${tr('tier.spotted')}, ${tr('tier.caught')}`)).toBeTruthy();
  });

  it('calls an undiscovered species not yet spotted, without naming it', async () => {
    await render(<AlmanacScreen species={[robin]} records={[]} />);
    expect(screen.getByLabelText(tr('almanac.undiscovered'))).toBeTruthy();
  });
});

it('reads the tier totals as words and numbers (T-329)', async () => {
  await render(<AlmanacScreen species={KRONOBERG_SPECIES.slice(0, 2)} records={[]} />);
  expect(screen.getByLabelText(`${tr('tier.spotted')}: 0`)).toBeTruthy();
});

// T-351 · review F-06: "Learn the names" appears once something is spotted.
it('offers "Learn the names" only after a first sighting', async () => {
  const onOpenTrainer = jest.fn();
  const sp = KRONOBERG_SPECIES[0];
  const { rerender } = await render(<AlmanacScreen species={[sp]} records={[]} onOpenTrainer={onOpenTrainer} />);
  expect(screen.queryByText(`🗣 ${tr('trainer.entry')}`)).toBeNull();
  await rerender(
    <AlmanacScreen
      species={[sp]}
      records={[
        { speciesId: sp.id, spottedAt: '2026-11-01T10:00:00Z', caughtAt: null, helpedAt: null, helpedKind: null, primeBonus: false },
      ]}
      onOpenTrainer={onOpenTrainer}
    />,
  );
  await fireEvent.press(screen.getByText(`🗣 ${tr('trainer.entry')}`));
  expect(onOpenTrainer).toHaveBeenCalledTimes(1);
});

// T-353 · review F-12.
it('opens the nature calendar', async () => {
  const onOpenCalendar = jest.fn();
  await render(<AlmanacScreen species={[KRONOBERG_SPECIES[0]]} records={[]} onOpenCalendar={onOpenCalendar} />);
  await fireEvent.press(screen.getByText(`📅 ${tr('calendar.entry')}`));
  expect(onOpenCalendar).toHaveBeenCalledTimes(1);
});
