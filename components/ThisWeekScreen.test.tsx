import { fireEvent, render, screen } from '@testing-library/react-native';
import ThisWeekScreen from './ThisWeekScreen';
import { createTranslator } from '../lib/i18n';
import { KRONOBERG_SPECIES } from '../lib/species/kronoberg';
import { commonNameFor } from '../lib/species/localized';

const tr = createTranslator('en');

describe('ThisWeekScreen', () => {
  it('renders the pull surface with the honest "active this season" footnote', async () => {
    await render(<ThisWeekScreen locale="en" spottedIds={new Set()} />);
    expect(screen.getByText(tr('thisWeek.title'), { exact: false })).toBeTruthy();
    expect(screen.getByText(tr('thisWeek.honesty'))).toBeTruthy();
  });

  it('shows the user\'s county with every active species counted, not only the rows shown', async () => {
    const live = {
      arriving: [],
      leaving: [],
      state: 'active' as const,
      total: 1834,
      items: [
        { species: { id: 'pike', scientificName: 'Esox lucius', category: 'fish' } as never, commonName: 'Gädda', detail: 'I grunda vikar', isNew: true },
        { species: { id: 'frog', scientificName: 'Rana temporaria', category: 'mammal' } as never, commonName: 'Rana temporaria', detail: null, isNew: false },
      ],
    };
    await render(<ThisWeekScreen locale="en" live={live} regionName="Skåne" />);
    expect(screen.getByText(tr('thisWeek.subtitle', { region: 'Skåne', count: 1834 }))).toBeTruthy();
    expect(screen.getByText('Gädda')).toBeTruthy();
    expect(screen.getByText('I grunda vikar')).toBeTruthy();
    expect(screen.getAllByText('Rana temporaria')).toHaveLength(2); // name falls back, detail too
    expect(screen.getAllByText(tr('thisWeek.new'))).toHaveLength(1);
  });

  it('offers to identify something with iNaturalist when the app can open it (T-223)', async () => {
    const onIdentify = jest.fn();
    await render(<ThisWeekScreen locale="en" onIdentify={onIdentify} />);
    await fireEvent.press(screen.getByText(`📷 ${tr('identify.cta')}`));
    expect(onIdentify).toHaveBeenCalledTimes(1);
  });

  it('shows no identify button without a handler', async () => {
    await render(<ThisWeekScreen locale="en" />);
    expect(screen.queryByText(`📷 ${tr('identify.cta')}`)).toBeNull();
  });
});

// T-275 · review B-15: with a home county the bundled Kronoberg list is never shown; while the
// county loads there is a loading state, and a failed load says so with a retry.
describe('ThisWeekScreen with a county', () => {
  it('shows a loading state, not the Kronoberg list, while the county loads', async () => {
    await render(<ThisWeekScreen locale="en" status="loading" regionName="Norrbotten" />);
    expect(screen.queryByText(tr('region.kronoberg'), { exact: false })).toBeNull();
    expect(screen.getByTestId('thisweek-loading')).toBeTruthy();
  });

  it('a failed load offers a retry', async () => {
    const onRetry = jest.fn();
    await render(
      <ThisWeekScreen locale="en" status="error" regionName="Norrbotten" onRetry={onRetry} />,
    );
    expect(screen.getByText(tr('thisWeek.loadError'))).toBeTruthy();
    await fireEvent.press(screen.getByText(tr('thisWeek.retry')));
    expect(onRetry).toHaveBeenCalled();
  });
});

// T-340 · review F-02: arriving soon / leaving soon, worded as what usually happens.
describe('ThisWeekScreen season shifts', () => {
  const item = (id: string, name: string) => ({
    species: { id, scientificName: name, category: 'bird' } as never,
    commonName: name,
    detail: null,
    isNew: true,
  });

  it('shows who usually arrives next month and who usually leaves, and opens their cards', async () => {
    const onSelectSpecies = jest.fn();
    const live = { state: 'active' as const, total: 1, items: [], arriving: [item('swift', 'Swift')], leaving: [item('crane', 'Crane')] };
    await render(<ThisWeekScreen locale="en" live={live} regionName="Skåne" month={4} onSelectSpecies={onSelectSpecies} />);
    expect(screen.getByText(tr('thisWeek.arriving', { region: 'Skåne', month: 'May' }))).toBeTruthy();
    expect(screen.getByText(tr('thisWeek.leaving', { region: 'Skåne', month: 'May' }))).toBeTruthy();
    await fireEvent.press(screen.getByText('Swift'));
    expect(onSelectSpecies).toHaveBeenCalledWith(expect.objectContaining({ id: 'swift' }));
  });

  it('shows neither heading when nothing qualifies', async () => {
    const live = { state: 'active' as const, total: 0, items: [], arriving: [], leaving: [] };
    await render(<ThisWeekScreen locale="en" live={live} regionName="Skåne" month={4} />);
    expect(screen.queryByText(tr('thisWeek.arriving', { region: 'Skåne', month: 'May' }))).toBeNull();
  });

  it('says "usually" in both languages: past records, never a claim about now', () => {
    for (const loc of ['en', 'sv'] as const) {
      const t = createTranslator(loc);
      expect(t('thisWeek.arriving', { region: 'X', month: 'Y' })).toMatch(loc === 'en' ? /usually/i : /brukar/i);
      expect(t('thisWeek.leaving', { region: 'X', month: 'Y' })).toMatch(loc === 'en' ? /usually/i : /brukar/i);
    }
  });
});

// T-357 · review F-17: the events the county's records show, and none in the preview.
describe('seasonal events strip', () => {
  const live = { arriving: [], leaving: [], state: 'active' as const, total: 0, items: [] };
  it('shows the events it is given for the county', async () => {
    await render(<ThisWeekScreen locale="en" live={live} regionName="Kronoberg" events={['swift-arrival', 'unknown-id']} />);
    expect(screen.getByText(tr('events.title'))).toBeTruthy();
    expect(screen.getByText(tr('event.swift-arrival.name'))).toBeTruthy();
  });

  it('shows none in the preview, whose bundled list has no monthly records', async () => {
    await render(<ThisWeekScreen locale="en" events={['swift-arrival']} />);
    expect(screen.queryByText(tr('events.title'))).toBeNull();
  });
});

// T-372: a name that is only the binomial is set in italics, as a field guide prints it, so it is
// not read as a common name; a plant without a photo shows a leaf, not a flower (clubmosses, ferns).
describe('species with no common name', () => {
  const { StyleSheet } = jest.requireActual('react-native');
  const clubmoss = { id: 'gbif:11185274', scientificName: 'Huperzia europaea', category: 'plant' } as never;
  const live = {
    arriving: [{ species: clubmoss, commonName: 'Huperzia europaea', detail: null, isNew: false }],
    leaving: [],
    state: 'active' as const,
    total: 1,
    items: [{ species: clubmoss, commonName: 'Huperzia europaea', detail: null, isNew: false }],
  };

  it('sets the binomial in italics in the list and the strip, with a leaf for a plant', async () => {
    await render(<ThisWeekScreen locale="en" live={live} regionName="Kronoberg" />);
    for (const el of screen.getAllByText('Huperzia europaea')) {
      expect(StyleSheet.flatten(el.props.style).fontStyle).toBe('italic');
    }
    expect(screen.getAllByText('🌿').length).toBeGreaterThan(0);
    expect(screen.queryByText('🌼')).toBeNull();
  });
});

// T-390: with "Show me" narrowed, the list says so and links to the choice.
describe('ThisWeekScreen with a "Show me" choice', () => {
  it('filters the preview list and says what it shows, with a way to change it', async () => {
    const onChange = jest.fn();
    await render(<ThisWeekScreen locale="en" month={5} interests={['bird', 'fish']} onChangeInterests={onChange} />);
    expect(screen.getByText(tr('interests.showing', { groups: `${tr('notif.group.bird')}, ${tr('notif.group.fish')}` }))).toBeTruthy();
    await fireEvent.press(screen.getByText(tr('interests.change')));
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('says nothing when everything is shown', async () => {
    await render(<ThisWeekScreen locale="en" month={5} interests={null} onChangeInterests={() => undefined} />);
    expect(screen.queryByText(tr('interests.change'))).toBeNull();
  });

  it('leaves out bundled species of other groups', async () => {
    const birds = new Set(KRONOBERG_SPECIES.filter((sp) => sp.category === 'bird').map((sp) => commonNameFor(sp, 'en')));
    const labels = () => screen.queryAllByTestId(/^thisweek-row-/).map((r) => r.props.accessibilityLabel as string);
    await render(<ThisWeekScreen locale="en" month={5} />);
    expect(labels().some((l) => birds.has(l))).toBe(true);
    await render(<ThisWeekScreen locale="en" month={5} interests={['plant']} />);
    expect(labels().length).toBeGreaterThan(0);
    expect(labels().some((l) => birds.has(l))).toBe(false);
  });
});
