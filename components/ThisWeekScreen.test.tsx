import { render, screen } from '@testing-library/react-native';
import ThisWeekScreen from './ThisWeekScreen';
import { createTranslator } from '../lib/i18n';

const tr = createTranslator('en');

describe('ThisWeekScreen', () => {
  it('renders the pull surface with the honest "active this season" footnote', async () => {
    await render(<ThisWeekScreen locale="en" spottedIds={new Set()} />);
    expect(screen.getByText(tr('thisWeek.title'), { exact: false })).toBeTruthy();
    expect(screen.getByText(tr('thisWeek.honesty'))).toBeTruthy();
  });
});
