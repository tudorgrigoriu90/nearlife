import { render, screen } from '@testing-library/react-native';
import FreeCatchSheet from './FreeCatchSheet';
import { createTranslator } from '../../lib/i18n';

const tr = createTranslator('en');

describe('FreeCatchSheet', () => {
  it('shows the gentle out-of-free-catches copy with the no-ads / mission-free reassurance', async () => {
    await render(<FreeCatchSheet onClose={() => {}} />);
    expect(screen.getByText(tr('paywall.title'))).toBeTruthy();
    expect(screen.getByText(tr('paywall.noAds'))).toBeTruthy();
    expect(screen.getByText(tr('paywall.freeMission'))).toBeTruthy();
  });
});
