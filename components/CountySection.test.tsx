import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import CountySection, { monthRange } from './CountySection';
import SpeciesCard from './SpeciesCard';
import type { CountyStats } from '../lib/countyStats';
import { createTranslator } from '../lib/i18n';
import { KRONOBERG_SPECIES } from '../lib/species/kronoberg';
import { contentFor } from '../lib/species/localized';

const sv = createTranslator('sv');
const warbler: CountyStats = {
  group: 'bird',
  occurrences: 18400,
  monthCounts: [0, 0, 0, 300, 4000, 3000, 1500, 600, 200, 0, 0, 0],
  season: { kind: 'season', from: 4, to: 9, peak: [5, 6], visitor: 'summer' },
  standing: { kind: 'rank', rank: 4, total: 240, occurrences: 18400 },
};

// T-262: the county section on the card.
describe('CountySection', () => {
  it('says when it is seen here, that it is a summer visitor, and its rank', async () => {
    await render(<CountySection locale="sv" countyName="Kronoberg" stats={warbler} month={11} />);
    expect(screen.getByText('I Kronoberg')).toBeTruthy();
    expect(
      screen.getByText('Ses här från april till september, flest fynd i maj–juni.'),
    ).toBeTruthy();
    expect(screen.getByText('En sommargäst.')).toBeTruthy();
    expect(screen.getByText('Nr 4 av 240 fåglar i Kronoberg: 18 400 fynd.')).toBeTruthy();
    expect(screen.queryByText(sv('county.now'))).toBeNull(); // November is not its peak
    expect(screen.getByText(sv('county.source'))).toBeTruthy();
  });

  it('draws 12 bars, the busiest month full height, this month highlighted, empty months flat', async () => {
    await render(<CountySection locale="sv" countyName="Kronoberg" stats={warbler} month={5} />);
    const height = (m: number) =>
      StyleSheet.flatten(screen.getByTestId(`county-bar-${m}`).props.style).height;
    expect(height(5)).toBe(44);
    expect(height(1)).toBe(0);
    expect(height(4)).toBeCloseTo(3.3, 1);
    expect(StyleSheet.flatten(screen.getByTestId('county-bar-5').props.style).backgroundColor).toBe(
      '#2f7d4f',
    );
    expect(screen.getByText(sv('county.now'))).toBeTruthy(); // May is in its peak
  });

  it('an uncommon species without monthly data: no chart, just how rare', async () => {
    const rare: CountyStats = {
      group: 'plant',
      occurrences: 12,
      monthCounts: null,
      season: null,
      standing: { kind: 'uncommon', occurrences: 12 },
    };
    await render(<CountySection locale="en" countyName="Kronoberg" stats={rare} month={5} />);
    expect(screen.queryByTestId('county-chart')).toBeNull();
    expect(screen.getByText('Uncommon here: only 12 records in Kronoberg.')).toBeTruthy();
  });

  it('formats a peak as one month or a range', () => {
    const names = sv('county.months').split('|');
    expect(monthRange([5], names)).toBe('maj');
    expect(monthRange([12, 1, 2], names)).toBe('december–februari');
  });
});

describe('SpeciesCard with county numbers', () => {
  const swift = KRONOBERG_SPECIES.find((s) => s.id === 'common-swift')!;
  const content = contentFor('common-swift', 'sv');

  it('shows the county section instead of the generic this-week line', async () => {
    await render(
      <SpeciesCard
        species={swift}
        content={content}
        locale="sv"
        county={{ name: 'Kronoberg', stats: warbler }}
        month={5}
      />,
    );
    expect(screen.getByText('I Kronoberg')).toBeTruthy();
    expect(screen.queryByText(content!.whenAndHow)).toBeNull();
  });

  it('keeps the generic line where the county is not known', async () => {
    await render(<SpeciesCard species={swift} content={content} locale="sv" />);
    expect(screen.getByText(content!.whenAndHow)).toBeTruthy();
  });
});

// T-263: worldwide threat status on the card.
describe('SpeciesCard threat badge', () => {
  const swift = KRONOBERG_SPECIES.find((s) => s.id === 'common-swift')!;

  it('shows the worldwide IUCN category under the Latin name', async () => {
    await render(<SpeciesCard species={swift} locale="sv" threat="VU" />);
    expect(screen.getByTestId('card-threat').props.children.join('')).toContain('Sårbar i världen');
    expect(screen.getByText(/IUCN:s rödlista/)).toBeTruthy();
  });

  it('says nothing for a species that is not threatened', async () => {
    await render(<SpeciesCard species={swift} locale="sv" />);
    expect(screen.queryByTestId('card-threat')).toBeNull();
    expect(screen.queryByTestId('card-threat-se')).toBeNull();
  });

  // T-332 · review I-35: each line names its scope, so "least concern worldwide, vulnerable in
  // Sweden" reads as two facts, not a contradiction.
  it('shows Sweden’s category on its own line, labelled with its scope and source', async () => {
    await render(<SpeciesCard species={swift} locale="sv" threat="NT" threatSe="VU" />);
    expect(screen.getByTestId('card-threat').props.children.join('')).toContain('Nära hotad i världen');
    const se = screen.getByTestId('card-threat-se').props.children.join('');
    expect(se).toContain('Sårbar i Sverige');
    expect(se).toContain('SLU Artdatabanken');
  });

  it('can show the Swedish line alone', async () => {
    await render(<SpeciesCard species={swift} locale="en" threatSe="RE" />);
    expect(screen.queryByTestId('card-threat')).toBeNull();
    expect(screen.getByTestId('card-threat-se').props.children.join('')).toContain('Regionally extinct in Sweden');
  });
});

// T-268 · review B-26: season is a real catch constraint (GDD §6). Out of season the card offers no
// catch and says when the species is usually back.
describe('SpeciesCard out of season', () => {
  const swift = KRONOBERG_SPECIES.find((s) => s.id === 'common-swift')!;

  it('replaces the catch button with the month it is usually back', async () => {
    const onFind = jest.fn();
    await render(<SpeciesCard species={swift} locale="sv" onFindNearby={onFind} backAround={5} />);
    expect(screen.queryByText(`${sv('card.findNearby')} →`)).toBeNull();
    expect(screen.getByText('Brukar synas här igen från maj.')).toBeTruthy();
  });

  it('keeps the catch button in season', async () => {
    await render(<SpeciesCard species={swift} locale="sv" onFindNearby={jest.fn()} />);
    expect(screen.getByText(`${sv('card.findNearby')} →`)).toBeTruthy();
  });
});
