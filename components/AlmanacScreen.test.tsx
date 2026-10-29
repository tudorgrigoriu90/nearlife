import { fireEvent, render, screen } from '@testing-library/react-native';
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
});
