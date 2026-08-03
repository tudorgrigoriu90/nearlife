module.exports = {
  preset: 'jest-expo',
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
