/* global describe, it, expect, __dirname */
// Plain JS: it needs Node's fs, and the app's tsconfig deliberately has no Node types.
const { readFileSync, readdirSync, statSync } = require('fs');
const { join, relative } = require('path');

// T-330 · review I-25: the app has no decorative animation, and none may arrive without honouring
// the system's reduced-motion setting. The minigames move because moving is the game; under reduced
// motion they start in easy mode instead (T-331). Anything else that animates must read
// `useReducedMotion` in the same file.

const ROOT = join(__dirname, '..');
const ANIMATION = /\bAnimated\.|\bLayoutAnimation\b|react-native-reanimated|useAnimatedStyle/;
// The minigames whose motion is the game (T-366 moved it to Animated). Under reduced motion they
// start in easy mode instead (useEasyMode reads useReducedMotion, T-331); nothing else is exempt.
const GAMEPLAY = new Set([
  'components/minigame/TimingRingMinigame.tsx',
  'components/minigame/FishReelMinigame.tsx',
  'components/minigame/TraceMinigame.tsx',
]);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(name) && !name.includes('.test.')) out.push(p);
  }
  return out;
}

describe('reduced motion', () => {
  it('every file that animates reads the reduced-motion setting', () => {
    const offenders = [...walk(join(ROOT, 'components')), join(ROOT, 'App.tsx')]
      .filter((f) => ANIMATION.test(readFileSync(f, 'utf8')))
      .filter((f) => !/useReducedMotion/.test(readFileSync(f, 'utf8')))
      .map((f) => relative(ROOT, f))
      .filter((f) => !GAMEPLAY.has(f));
    expect(offenders).toEqual([]);
  });

  it('easy mode, which the minigames fall back to, follows the reduced-motion setting', () => {
    expect(readFileSync(join(ROOT, 'components/useEasyMode.ts'), 'utf8')).toMatch(/useReducedMotion/);
  });
});
