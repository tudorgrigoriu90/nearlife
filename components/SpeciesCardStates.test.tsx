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
