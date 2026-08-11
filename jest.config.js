module.exports = {
  preset: 'jest-expo',
  // Mock expo-notifications everywhere (T-161): its real import registers a push-token listener
  // (DevicePushTokenAutoRegistration.fx) that leaks an open handle and makes Jest hang on teardown.
  // The app uses only requestPermissionsAsync (lib/permissions.ts), so the stub in __mocks__ is
  // behaviour-equivalent for tests and lets workers exit cleanly.
  moduleNameMapper: {
    '^expo-notifications$': '<rootDir>/__mocks__/expo-notifications.js',
  },
  // Restore a real TextDecoder/TextEncoder before test modules load (T-091) so h3-js' emscripten
  // build can initialize under jest-expo. The preset leaves setupFilesAfterEnv unset, so this adds
  // rather than clobbers.
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  // Honest coverage: measure every source file, not just the ones a test happens to import.
  // Generated data manifests and test files are excluded.
  collectCoverageFrom: [
    'lib/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    'App.tsx',
    '!**/*.test.{ts,tsx}',
    '!lib/species/media.kronoberg.ts',
  ],
  // Ratchet (T-143): the render-test setup fix + component/App-flow/minigame tests took coverage
  // ~45% → ~91% statements / ~92% lines. Floors sit just under the achieved level so a real
  // regression fails CI (via `npm run verify:ci`) without brittleness. Raise as coverage grows.
  coverageThreshold: {
    global: { statements: 90, branches: 80, functions: 85, lines: 90 },
  },
};
