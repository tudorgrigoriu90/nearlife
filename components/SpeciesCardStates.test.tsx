import { fireEvent, render, screen } from '@testing-library/react-native';
import SpeciesCard from './SpeciesCard';
import { createTranslator } from '../lib/i18n';
import { KRONOBERG_SPECIES } from '../lib/species/kronoberg';
import { contentFor } from '../lib/species/localized';

const en = createTranslator('en');
const sv = createTranslator('sv');
const swift = KRONOBERG_SPECIES.find((s) => s.id === 'common-swift')!;

// T-283 · review B-28: invariant #2 promises give and protect for every species, so a card whose
// text is still on its way, or failed to arrive, says so.
describe('SpeciesCard content states', () => {
  it('loading: a placeholder, not an empty card', async () => {
    await render(<SpeciesCard species={swift} locale="en" content={null} contentState="loading" />);
    expect(screen.getByTestId('card-content-loading')).toBeTruthy();
  });

  it('error: a message and a retry', async () => {
    const onRetry = jest.fn();
    await render(
      <SpeciesCard
        species={swift}
        locale="en"
        content={null}
        contentState="error"
        onRetryContent={onRetry}
      />,
    );
    expect(screen.getByText(en('card.contentError'))).toBeTruthy();
    await fireEvent.press(screen.getByText(en('thisWeek.retry')));
    expect(onRetry).toHaveBeenCalled();
  });

  it('missing: says the text is not written yet', async () => {
    await render(<SpeciesCard species={swift} locale="en" content={null} contentState="missing" />);
    expect(screen.getByText(en('card.contentMissing'))).toBeTruthy();
  });

  it('ready: the content', async () => {
    const content = contentFor('common-swift', 'en')!;
    await render(<SpeciesCard species={swift} locale="en" content={content} contentState="ready" />);
    expect(screen.getByText(content.give)).toBeTruthy();
  });
});

// T-283 · review B-30: the pills are progress; nothing promises an unlock that has no content.
describe('SpeciesCard progress pills', () => {
  it('say progress, not "unlock"', async () => {
    await render(<SpeciesCard species={swift} locale="en" />);
    expect(screen.getByText(en('card.depth'))).toBeTruthy();
    expect(en('card.depth')).not.toMatch(/unlock/i);
    expect(screen.queryByText(/unlock/i)).toBeNull();
  });
});

// T-283 · review B-64: machine-status text as the main language carries the notice too.
describe('main-language machine text', () => {
  it('a Swedish card says its text is machine-translated', async () => {
    await render(
      <SpeciesCard species={swift} locale="sv" content={contentFor('common-swift', 'sv') ?? null} />,
    );
    expect(screen.getByText(sv('card.machineText'))).toBeTruthy();
  });

  it('an English card does not', async () => {
    await render(
      <SpeciesCard species={swift} locale="en" content={contentFor('common-swift', 'en') ?? null} />,
    );
    expect(screen.queryByText(en('card.machineText'))).toBeNull();
  });
});

// T-293 · review I-32: every card can report a wrong name, photo, text or season.
describe('SpeciesCard "Report a mistake"', () => {
  it('opens the report from the card', async () => {
    const onReport = jest.fn();
    await render(
      <SpeciesCard
        species={swift}
        locale="sv"
        content={contentFor(swift.id, 'sv') ?? null}
        onReportMistake={onReport}
      />,
    );
    await fireEvent.press(screen.getByText(sv('report.link')));
    expect(onReport).toHaveBeenCalledTimes(1);
  });

  it('is absent where reports cannot be sent', async () => {
    await render(<SpeciesCard species={swift} locale="en" content={contentFor(swift.id, 'en') ?? null} />);
    expect(screen.queryByText(en('report.link'))).toBeNull();
  });
});

// T-298 · review B-29: the card shows the tiers reached, what was pledged, and offers no second
// catch in a season.
describe('SpeciesCard tier marks', () => {
  const base = {
    speciesId: swift.id,
    spottedAt: '2026-06-03T10:00:00Z',
    caughtAt: null,
    helpedAt: null,
    helpedKind: null,
    primeBonus: false,
  };
  const day = (iso: string) => new Date(iso).toLocaleDateString('en', { day: 'numeric', month: 'short' });
  const content = contentFor(swift.id, 'en') ?? null;

  it('spotted only: the Spotted mark with its date, no other', async () => {
    await render(<SpeciesCard species={swift} locale="en" content={content} record={base} tier={{ spotted: true, caught: false, helped: false }} />);
    expect(screen.getByText(`${en('tier.spotted')} ${day(base.spottedAt)}`)).toBeTruthy();
    expect(screen.queryByText(en('tier.caught'), { exact: false })).toBeNull();
  });

  it('caught and helped: every mark, and the pledged action is marked', async () => {
    const record = { ...base, caughtAt: '2026-06-05T10:00:00Z', helpedAt: '2026-06-06T10:00:00Z', helpedKind: 'protect' as const };
    await render(
      <SpeciesCard
        species={swift}
        locale="en"
        content={content}
        record={record}
        tier={{ spotted: true, caught: true, helped: true }}
        onPledge={() => {}}
      />,
    );
    expect(screen.getByText(`${en('tier.caught')} ${day(record.caughtAt)}`)).toBeTruthy();
    expect(screen.getByText(`${en('tier.helped')} ${day(record.helpedAt)}`)).toBeTruthy();
    expect(screen.getByText(en('card.pledged'))).toBeTruthy();
    expect(screen.queryByText(en('card.pledge'), { exact: false })).toBeNull();
  });

  it('caught this season: no catch button, a plain note instead', async () => {
    const onFind = jest.fn();
    await render(
      <SpeciesCard
        species={swift}
        locale="en"
        content={content}
        record={{ ...base, caughtAt: new Date().toISOString() }}
        tier={{ spotted: true, caught: true, helped: false }}
        caughtThisSeason
        onFindNearby={onFind}
      />,
    );
    expect(screen.getByText(en('card.caughtThisSeason'))).toBeTruthy();
    expect(screen.queryByText(en('card.findNearby'), { exact: false })).toBeNull();
  });
});
