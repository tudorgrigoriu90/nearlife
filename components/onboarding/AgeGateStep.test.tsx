import { fireEvent, render, screen } from '@testing-library/react-native';
import AgeGateStep from './AgeGateStep';
import { createTranslator } from '../../lib/i18n';

const tr = createTranslator('en');
const CURRENT_YEAR = 2026;
const placeholder = tr('onboarding.age.placeholder');
const ctaLabel = tr('onboarding.age.cta');

// RNTL 14's render + fireEvent are async — await them so state flushes before the next query.
async function renderStep(onSubmit = jest.fn()) {
  await render(<AgeGateStep locale="en" currentYear={CURRENT_YEAR} onSubmit={onSubmit} />);
  return onSubmit;
}

describe('AgeGateStep', () => {
  it('shows the birth-year prompt', async () => {
    await renderStep();
    expect(screen.getByText(tr('onboarding.age.title'))).toBeTruthy();
    expect(screen.getByPlaceholderText(placeholder)).toBeTruthy();
  });

  it('keeps Continue inert until a valid 4-digit year is entered, then submits it', async () => {
    const onSubmit = await renderStep();

    // Nothing entered → disabled → pressing does nothing.
    await fireEvent.press(screen.getByText(ctaLabel));
    expect(onSubmit).not.toHaveBeenCalled();

    // Partial / implausible → still disabled.
    await fireEvent.changeText(screen.getByPlaceholderText(placeholder), '19');
    await fireEvent.press(screen.getByText(ctaLabel));
    expect(onSubmit).not.toHaveBeenCalled();

    // Valid year → submits the parsed number (re-query the button so its handler is current).
    await fireEvent.changeText(screen.getByPlaceholderText(placeholder), '1990');
    await fireEvent.press(screen.getByText(ctaLabel));
    expect(onSubmit).toHaveBeenCalledWith(1990);
  });

  it('strips non-digits and caps input at four characters', async () => {
    const onSubmit = await renderStep();
    await fireEvent.changeText(screen.getByPlaceholderText(placeholder), '2o1x5abc9');
    expect(screen.getByPlaceholderText(placeholder).props.value).toBe('2159'); // digits only, first 4
    // 2159 > currentYear (2026) → invalid → no submit
    await fireEvent.press(screen.getByText(ctaLabel));
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
