module.exports = {
  preset: 'jest-expo',
  // Honest coverage: measure every source file, not just the ones a test happens to import.
  // Generated data manifests and test files are excluded. Component/UI files currently show low
  // coverage — they need a React Native render-test setup that works on React 19 (T-143).
  collectCoverageFrom: [
    'lib/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    'App.tsx',
    '!**/*.test.{ts,tsx}',
    '!lib/species/media.kronoberg.ts',
  ],
};
