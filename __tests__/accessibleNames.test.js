/* global describe, it, expect, __dirname */
// Plain JS: it needs Node's fs, and the app's tsconfig deliberately has no Node types.
const { readFileSync, readdirSync, statSync } = require('fs');
const { join, relative } = require('path');

// T-329 · review I-25: every control has a name a screen reader can say. A Pressable needs a role,
// and either an accessibilityLabel or readable text inside it. Readable means letters or a
// translated string: a control whose only content is a symbol or an emoji (×, ▶, 🐦) is read out as
// that symbol, or not at all, so it must carry a label.

const ROOT = join(__dirname, '..');

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (name.endsWith('.tsx') && !name.includes('.test.')) out.push(p);
  }
  return out;
}

/** The opening tag at the start of `src` (a `>` inside `{…}` or an arrow `=>` does not end it). */
function openingTag(src) {
  let braces = 0;
  for (let i = 0; i < src.length; i += 1) {
    const c = src[i];
    if (c === '{') braces += 1;
    else if (c === '}') braces -= 1;
    else if (c === '>' && braces === 0 && src[i - 1] !== '=') return src.slice(0, i + 1);
  }
  return src;
}

/** Each `<Pressable …>…</Pressable>` (or self-closed) element's source, with nesting respected. */
function pressables(src) {
  const found = [];
  const open = /<(Pressable|TouchableOpacity)\b/g;
  let m;
  while ((m = open.exec(src))) {
    const tag = m[1];
    const head = openingTag(src.slice(m.index));
    if (head.endsWith('/>')) {
      found.push({ at: m.index, head, body: '' });
      continue;
    }
    const token = new RegExp(`<${tag}\\b|</${tag}>`, 'g');
    token.lastIndex = m.index + head.length;
    let depth = 1;
    let t;
    while (depth > 0 && (t = token.exec(src))) {
      if (t[0].startsWith('</')) depth -= 1;
      else if (!openingTag(src.slice(t.index)).endsWith('/>')) depth += 1;
    }
    found.push({ at: m.index, head, body: src.slice(m.index + head.length, t ? t.index : undefined) });
  }
  return found;
}

function readable(body) {
  if (/\btr?\(/.test(body)) return true; // a translated string
  for (const [, inner] of body.matchAll(/<Text\b[^>]*>([\s\S]*?)<\/Text>/g)) {
    const literal = inner.replace(/\{[^}]*\}/g, '');
    if (/\p{L}/u.test(literal)) return true; // literal words
    // A value from code (a name, a label): readable unless it is a glyph or an icon.
    const exprs = [...inner.matchAll(/\{([^}]*)\}/g)].map((x) => x[1]);
    if (exprs.some((e) => e.trim() && !/glyph|icon|emoji|symbol|mark|['"`]/i.test(e))) return true;
  }
  return false;
}

function problems() {
  const out = [];
  for (const file of [...walk(join(ROOT, 'components')), join(ROOT, 'App.tsx')]) {
    const src = readFileSync(file, 'utf8');
    for (const { at, head, body } of pressables(src)) {
      const where = `${relative(ROOT, file)}:${src.slice(0, at).split('\n').length}`;
      if (!/accessibilityRole=/.test(head)) out.push(`${where} has no role`);
      else if (!/accessibilityLabel=/.test(head) && !readable(body)) out.push(`${where} has no name`);
    }
  }
  return out;
}

describe('accessible names', () => {
  it('every control has a role and a name', () => {
    expect(problems()).toEqual([]);
  });
});
