import { fireEvent, render, screen } from '@testing-library/react-native';
import NatureCalendarScreen from './NatureCalendarScreen';
import { createTranslator } from '../lib/i18n';
import type { Species } from '../lib/species/types';

// T-353 · review F-12.
const tr = createTranslator('en');
const months = tr('county.months').split('|');
const sp = (id: string, name: string, month: number): Species =>
  ({
    id,
    scientificName: id,
    commonName: name,
    category: 'bird',
    rarity: 'common',
    activeMonths: [],
    county: { occurrences: 5, monthCounts: Array.from({ length: 12 }, (_, i) => (i === month - 1 ? 5 : 0)) },
  }) as Species;

describe('NatureCalendarScreen', () => {
  it('starts at this month, lists the most recorded species and opens one', async () => {
    const onOpen = jest.fn();
    await render(
      <NatureCalendarScreen
        locale="en"
        county="Kronoberg"
        species={[sp('crane', 'Common Crane', 4), sp('waxwing', 'Bohemian Waxwing', 12)]}
        month={11}
        onOpenSpecies={onOpen}
        onDone={() => undefined}
      />,
    );
    expect(screen.getByText(tr('calendar.subtitle', { county: 'Kronoberg' }))).toBeTruthy();
    const headings = screen.getAllByRole('header').map((h) => h.props.children);
    expect(headings.slice(0, 3)).toEqual([months[10], months[11], months[0]]);
    expect(screen.getAllByText(tr('calendar.none')).length).toBe(10);
    await fireEvent.press(screen.getByText(/Common Crane/));
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: 'crane' }));
  });

  it('says so when the county has no monthly records yet', async () => {
    const onDone = jest.fn();
    await render(<NatureCalendarScreen locale="en" county={null} species={[]} month={1} onOpenSpecies={() => undefined} onDone={onDone} />);
    expect(screen.getByText(tr('calendar.empty'))).toBeTruthy();
    await fireEvent.press(screen.getByText(tr('settings.done')));
    expect(onDone).toHaveBeenCalled();
  });
});
