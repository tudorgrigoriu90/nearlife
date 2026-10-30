import { fireEvent, render, screen } from '@testing-library/react-native';
import ProtectTip from './ProtectTip';
import { KRONOBERG_SPECIES } from '../../lib/species/kronoberg';
import { contentFor } from '../../lib/species/localized';
import { createTranslator } from '../../lib/i18n';

const tr = createTranslator('en');
const swift = KRONOBERG_SPECIES.find((s) => s.id === 'common-swift')!;

describe('ProtectTip', () => {
  it('shows the species protect content on the catch-success moment', async () => {
    await render(<ProtectTip species={swift} onDone={() => {}} />);
    expect(screen.getByText(contentFor(swift.id, 'en')!.protect)).toBeTruthy();
  });

  it('calls onDone when the continue CTA is pressed', async () => {
    const onDone = jest.fn();
    await render(<ProtectTip species={swift} onDone={onDone} />);
    fireEvent.press(screen.getByText(tr('catch.continue')));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('celebrates a prime catch, made inside the species\' active season (T-074)', async () => {
    await render(<ProtectTip species={swift} prime onDone={() => {}} />);
    expect(screen.getByText(`✨ ${tr('catch.prime')}`)).toBeTruthy();
  });

  it('says nothing about prime for a catch outside the season', async () => {
    await render(<ProtectTip species={swift} onDone={() => {}} />);
    expect(screen.queryByText(`✨ ${tr('catch.prime')}`)).toBeNull();
  });
});
