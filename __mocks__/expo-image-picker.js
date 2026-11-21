/* global jest */
// Image picker stub for Jest (T-348): there is no camera or gallery in tests.
module.exports = {
  requestCameraPermissionsAsync: jest.fn(async () => ({ granted: true })),
  launchCameraAsync: jest.fn(async () => ({ canceled: false, assets: [{ uri: 'file:///cache/camera.jpg' }] })),
  launchImageLibraryAsync: jest.fn(async () => ({ canceled: false, assets: [{ uri: 'file:///cache/gallery.jpg' }] })),
};
