/* global jest */
// Jest mock for expo-notifications (T-161). The real module runs a push-token auto-registration
// side effect on import (DevicePushTokenAutoRegistration.fx → addPushTokenListener) that leaves an
// open handle. Under Jest that makes workers hang on teardown ("a worker process failed to exit
// gracefully"), inflating `npm run verify` wall-time and risking slow/flaky CI. The app touches
// expo-notifications in exactly one place — `lib/permissions.ts`, which calls only
// `requestPermissionsAsync` — so this minimal, side-effect-free stand-in is behaviour-equivalent for
// tests and lets Jest exit cleanly. Wired unconditionally via jest.config.js `moduleNameMapper`.
// A test that needs a specific permission outcome can still override with a per-file jest.mock.

module.exports = {
  requestPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  getPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  setNotificationHandler: jest.fn(),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  scheduleNotificationAsync: jest.fn(async () => 'test-notification-id'),
};
