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

// T-274 · review B-13: a catch the server refused is explained, with the same choices.
describe('FreeCatchSheet for a refused catch', () => {
  it('names the species that could not be saved', async () => {
    await render(<FreeCatchSheet onClose={() => {}} refusedName="Red fox" />);
    expect(screen.getByText(tr('catch.refused.title', { name: 'Red fox' }))).toBeTruthy();
    expect(screen.getByText(tr('catch.refused.body'))).toBeTruthy();
    expect(screen.getByText(tr('paywall.noAds'))).toBeTruthy();
  });
});
