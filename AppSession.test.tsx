import AsyncStorage from '@react-native-async-storage/async-storage';
import { render, screen } from '@testing-library/react-native';
import App from './App';
import { CONSENT_STORAGE_KEY } from './lib/consentStore';
import { DEFAULT_CONSENT } from './lib/consent';
import { createTranslator } from './lib/i18n';
import { ONBOARDING_STORAGE_KEY } from './lib/onboardingStore';

// T-270 · review B-06: with analytics consent stored, a launch sends exactly one session_start,
// through the real consent gate and PostHog tracker.

const mockCapture = jest.fn();
jest.mock('posthog-react-native', () => ({
  PostHog: jest.fn().mockImplementation(() => ({ capture: mockCapture, reset: jest.fn() })),
}));
jest.mock('./lib/posthogConfig', () => ({
  hasPostHogConfig: () => true,
  getPostHogConfig: () => ({ apiKey: 'k', host: 'https://eu.i.posthog.com' }),
}));
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('./lib/permissions', () => ({
  requestLocationPermission: jest.fn(async () => 'granted'),
  requestLocationAccess: jest.fn(async () => 'granted'),
  getLocationFixOnce: jest.fn(async () => ({ latitude: 56.879, longitude: 14.806 })),
  getCatchFix: jest.fn(async () => ({ latitude: 56.879, longitude: 14.806, accuracyM: 10 })),
  requestNotificationPermission: jest.fn(async () => 'granted'),
  getNotificationPermission: jest.fn(async () => 'granted'),
  getDevicePushToken: jest.fn(async () => null),
  onPushTokenChange: jest.fn(() => () => {}),
  showNotificationsInForeground: jest.fn(),
  onNotificationTap: jest.fn(() => () => {}),
}));

const tr = createTranslator('en');
const sessions = () => mockCapture.mock.calls.filter(([e]) => e === 'session_start').length;

beforeEach(async () => {
  await AsyncStorage.clear();
  mockCapture.mockClear();
  await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify({ agePath: 'full' }));
});

describe('session_start on launch', () => {
  it('is sent once when analytics consent is stored', async () => {
    await AsyncStorage.setItem(
      CONSENT_STORAGE_KEY,
      JSON.stringify({ ...DEFAULT_CONSENT, analytics: true }),
    );
    await render(<App />);
    await screen.findByText(tr('thisWeek.honesty'));
    expect(sessions()).toBe(1);
  });

  it('is not sent when analytics consent is stored as off', async () => {
    await AsyncStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(DEFAULT_CONSENT));
    await render(<App />);
    await screen.findByText(tr('thisWeek.honesty'));
    expect(sessions()).toBe(0);
  });
});
