import { fireEvent, render, screen } from '@testing-library/react-native';
import PledgeConfirm from './PledgeConfirm';
import { KRONOBERG_SPECIES } from '../../lib/species/kronoberg';
import { createTranslator } from '../../lib/i18n';

const tr = createTranslator('en');
const swift = KRONOBERG_SPECIES.find((s) => s.id === 'common-swift')!;

describe('PledgeConfirm', () => {
  it('confirms an honor-system pledge with the follow-law line', async () => {
    await render(<PledgeConfirm species={swift} kind="give" locale="en" onDone={() => {}} />);
    expect(screen.getByText(tr('pledge.thanks'))).toBeTruthy();
    expect(screen.getByText(/⚖/)).toBeTruthy();
  });

  it('calls onDone when the CTA is pressed', async () => {
    const onDone = jest.fn();
    await render(<PledgeConfirm species={swift} kind="protect" locale="en" onDone={onDone} />);
    fireEvent.press(screen.getByText(tr('pledge.done')));
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
