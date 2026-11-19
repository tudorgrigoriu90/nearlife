// Flat ESLint config: Expo's recommended rules + Prettier (turns off formatting rules
// that would conflict with Prettier). See CLAUDE.md for the way of working.
const expoConfig = require('eslint-config-expo/flat');
const eslintConfigPrettier = require('eslint-config-prettier');

module.exports = [
  ...expoConfig,
  eslintConfigPrettier,
  {
    // Jest hoists jest.mock() above the imports, and a mock factory may only reach modules
    // through require(); a test that mocks before importing is the documented pattern, not
    // disorder. Everywhere else both rules stay on (T-289: lint runs with --max-warnings 0).
    files: ['**/*.test.ts', '**/*.test.tsx', '**/*.test.js'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      'import/first': 'off',
    },
  },
  {
    // supabase/functions/* are Deno Edge Functions (separate runtime + globals) — not linted here.
    ignores: ['dist/*', 'node_modules/*', '.expo/*', 'coverage/*', 'supabase/functions/*'],
  },
];
