import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import SpeciesCard from './SpeciesCard';
import { KRONOBERG_SPECIES } from '../lib/species/kronoberg';
import { commonNameFor, contentFor } from '../lib/species/localized';
import { createTranslator } from '../lib/i18n';
import { FSI, PDI, stripIsolates } from '../lib/i18n/bidi';

const tr = createTranslator('en');
const swift = KRONOBERG_SPECIES.find((s) => s.id === 'common-swift')!;
// Content is passed in now (T-059) — the caller loads it via SpeciesRepository. Tests supply the
// bundled content directly so the card stays a pure presentational component.
const swiftContent = contentFor('common-swift', 'en');

describe('SpeciesCard', () => {
  it('shows the always-free mission content (name, give, protect) even before spotting', async () => {
    await render(<SpeciesCard species={swift} content={swiftContent} locale="en" />);
    expect(screen.getByText(commonNameFor(swift, 'en'))).toBeTruthy();
    expect(screen.getByText(tr('card.give'))).toBeTruthy();
    expect(screen.getByText(tr('card.protect'))).toBeTruthy();
  });

  it('hides the mission block until content has loaded (null content)', async () => {
    await render(<SpeciesCard species={swift} content={null} locale="en" />);
    // Name + scientific name (from the species) still render; mission sections do not.
    expect(screen.getByText(commonNameFor(swift, 'en'))).toBeTruthy();
    expect(screen.queryByText(tr('card.give'))).toBeNull();
  });

  it('launches the catch flow from "find it nearby"', async () => {
    const onFindNearby = jest.fn();
    await render(
      <SpeciesCard species={swift} content={swiftContent} locale="en" onFindNearby={onFindNearby} />,
    );
    fireEvent.press(screen.getByText(tr('card.findNearby'), { exact: false }));
    expect(onFindNearby).toHaveBeenCalledTimes(1);
  });
});

// ── Mother-tongue dual display (T-150 · F13.3) ───────────────────────────────
describe('SpeciesCard — dual language', () => {
  const svContent = contentFor('common-swift', 'sv');

  it('is single-language when no secondary locale is set (the default)', async () => {
    await render(<SpeciesCard species={swift} content={swiftContent} locale="en" />);
    expect(screen.getByText(commonNameFor(swift, 'en'))).toBeTruthy();
    // No slash-joined title, no machine-translation notice.
    expect(screen.queryByText(tr('dual.machineTranslated'), { exact: false })).toBeNull();
  });

  it('joins the two common names with a slash in the title', async () => {
    await render(
      <SpeciesCard
        species={swift}
        content={swiftContent}
        locale="en"
        secondaryContent={svContent}
        secondaryLocale="sv"
      />,
    );
    // The rendered title carries invisible bidi isolates around each half (T-157) so the
    // delimiter stays anchored when one language is right-to-left.
    const en = commonNameFor(swift, 'en');
    const sv = commonNameFor(swift, 'sv');
    expect(en).not.toBe(sv); // guard: this species really does have two different names
    const rendered = screen.getByText(`${FSI}${en}${PDI} / ${FSI}${sv}${PDI}`);
    expect(rendered).toBeTruthy();
    expect(stripIsolates(rendered.props.children as string)).toBe(`${en} / ${sv}`);
  });

  it('shows both languages of the mission content, primary first', async () => {
    await render(
      <SpeciesCard
        species={swift}
        content={swiftContent}
        locale="en"
        secondaryContent={svContent}
        secondaryLocale="sv"
      />,
    );
    // give/protect are the law-sensitive fields — both halves must be present (invariant #2).
    expect(screen.getByText(swiftContent!.give)).toBeTruthy();
    expect(screen.getByText(svContent!.give)).toBeTruthy();
    expect(screen.getByText(swiftContent!.protect)).toBeTruthy();
    expect(screen.getByText(svContent!.protect)).toBeTruthy();
  });

  it('labels machine-translated content so it is never mistaken for reviewed advice', async () => {
    await render(
      <SpeciesCard
        species={swift}
        content={swiftContent}
        locale="en"
        secondaryContent={svContent}
        secondaryLocale="sv"
      />,
    );
    // sv is `machine` status; the notice names the language in its own script.
    expect(screen.getByText(`Svenska · ${tr('dual.machineTranslated')}`)).toBeTruthy();
  });

  it('degrades to the primary alone when the secondary content is missing', async () => {
    await render(
      <SpeciesCard
        species={swift}
        content={swiftContent}
        locale="en"
        secondaryContent={null}
        secondaryLocale="sv"
      />,
    );
    // Primary content intact, and nothing blank or duplicated in its place.
    expect(screen.getByText(swiftContent!.give)).toBeTruthy();
    expect(screen.getByText(commonNameFor(swift, 'en'), { exact: false })).toBeTruthy();
  });

  it('renders a right-to-left secondary with its own writing direction', async () => {
    const arabic = {
      speciesId: 'common-swift',
      fact: 'السمامة الشائعة تقضي معظم حياتها في الطيران.',
      whenAndHow: 'تُرى في السماء فوق البلدات في الصيف.',
      give: 'اترك فتحات السقف مفتوحة لأعشاش السمام.',
      protect: 'لا تسدّ مواقع الأعشاش أثناء موسم التعشيش.',
    };
    await render(
      <SpeciesCard
        species={swift}
        content={swiftContent}
        locale="en"
        secondaryContent={arabic}
        secondaryLocale="ar"
      />,
    );
    const arabicGive = screen.getByText(arabic.give);
    expect(arabicGive).toBeTruthy();
    // The Arabic paragraph carries rtl direction; the English one must not.
    expect(StyleSheet.flatten(arabicGive.props.style)).toMatchObject({ writingDirection: 'rtl' });
    expect(StyleSheet.flatten(screen.getByText(swiftContent!.give).props.style)).toMatchObject({
      writingDirection: 'ltr',
    });
  });
});
