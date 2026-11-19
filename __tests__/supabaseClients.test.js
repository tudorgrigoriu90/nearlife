/* global describe, it, expect, __dirname */
// Plain JS: it needs Node's fs, and the app's tsconfig deliberately has no Node types.
const { readFileSync, readdirSync, statSync } = require('fs');
const { join, relative } = require('path');

// T-308 · review B-35, B-36.

const ROOT = join(__dirname, '..');
function files(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return files(p);
    return /\.(ts|tsx)$/.test(name) && !/\.test\.(ts|tsx)$/.test(name) ? [p] : [];
  });
}
const sources = [...files(join(ROOT, 'lib')), ...files(join(ROOT, 'components')), join(ROOT, 'App.tsx')];

describe('Supabase clients', () => {
  it('createClient is called from lib/supabase.ts only (one client, one auth session)', () => {
    // `createClient<Database>(` counts too (T-335); the generated types file only names it in a comment.
    const callers = sources
      .filter((f) => !f.endsWith('database.types.ts'))
      .filter((f) => /\bcreateClient(<[^>]*>)?\(/.test(readFileSync(f, 'utf8')))
      .map((f) => relative(ROOT, f));
    expect(callers).toEqual(['lib/supabase.ts']);
  });

  it('no screen gets a gateway created during render', () => {
    // A new gateway on every App render re-ran the screen's load effect (Family, Link email).
    const app = readFileSync(join(ROOT, 'App.tsx'), 'utf8');
    expect(app.match(/gateway=\{new /g) ?? []).toEqual([]);
  });
});
