/* global jest */
// Sharing stub for Jest (T-368): the native share sheet does not exist in tests.
module.exports = {
  isAvailableAsync: jest.fn(async () => true),
  shareAsync: jest.fn(async () => undefined),
};
