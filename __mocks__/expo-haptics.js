/* global jest */
// Haptics stub for Jest (T-366): the native vibration module does not exist in tests. Same
// pattern as the expo-speech stub; MinigameShell.test.tsx checks the calls.
module.exports = {
  notificationAsync: jest.fn(async () => undefined),
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
};
