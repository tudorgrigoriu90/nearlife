// T-269 · review B-52: after an account deletion the next account must not continue the deleted
// person in analytics.
const mockReset = jest.fn();
jest.mock('posthog-react-native', () => ({
  PostHog: jest.fn().mockImplementation(() => ({ reset: mockReset })),
}));
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('./posthogConfig', () => ({
  getPostHogConfig: () => ({ apiKey: 'k', host: 'https://eu.i.posthog.com' }),
}));

import { getPostHogClient, resetAnalyticsIdentity } from './posthog';

describe('resetAnalyticsIdentity', () => {
  it('does nothing before analytics ever started', () => {
    resetAnalyticsIdentity();
    expect(mockReset).not.toHaveBeenCalled();
  });

  it('resets the distinct id of a running client', () => {
    getPostHogClient();
    resetAnalyticsIdentity();
    expect(mockReset).toHaveBeenCalledTimes(1);
  });
});
