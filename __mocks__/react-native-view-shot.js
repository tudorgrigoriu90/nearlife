/* global jest */
// View-shot stub for Jest (T-368): there is no native view to capture in tests.
module.exports = { captureRef: jest.fn(async () => 'file:///tmp/nearby-card.png') };
