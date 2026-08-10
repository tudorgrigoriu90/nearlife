// Flat ESLint config: Expo's recommended rules + Prettier (turns off formatting rules
// that would conflict with Prettier). See CLAUDE.md for the way of working.
const expoConfig = require('eslint-config-expo/flat');
const eslintConfigPrettier = require('eslint-config-prettier');

module.exports = [
  ...expoConfig,
  eslintConfigPrettier,
  {
    // supabase/functions/* are Deno Edge Functions (separate runtime + globals) — not linted here.
    ignores: ['dist/*', 'node_modules/*', '.expo/*', 'coverage/*', 'supabase/functions/*'],
  },
];
