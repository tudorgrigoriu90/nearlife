import { render, screen } from '@testing-library/react-native';
import App from './App';
import { createTranslator } from './lib/i18n';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const tr = createTranslator('en');

describe('App', () => {
  it('boots into the compliance-shaped onboarding flow', async () => {
    await render(<App />);
    // Onboarding gates the app shell (T-022+); the welcome step renders first.
    expect(screen.getByText(tr('onboarding.welcome.title'))).toBeTruthy();
  });
});
