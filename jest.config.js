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
  // Ratchet: floors a few points below the current level (T-143 lifted it ~45% → ~75% once the
  // RN render-test setup worked). Raise toward 90% as App-flow + minigame-interaction tests land.
  // Enforced in CI via `npm run verify:ci` (local `npm run verify` stays fast, no coverage).
  coverageThreshold: {
    global: { statements: 70, branches: 58, functions: 65, lines: 70 },
  },
};
