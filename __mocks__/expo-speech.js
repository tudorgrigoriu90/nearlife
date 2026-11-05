/* global jest */
// Speech stub for Jest (T-244): the native text-to-speech module does not exist in tests. Same
// pattern as the expo-notifications stub; components/ReadAloud.test.tsx mocks it per test.
module.exports = {
  speak: jest.fn(),
  stop: jest.fn(async () => undefined),
  getAvailableVoicesAsync: jest.fn(async () => []),
};
