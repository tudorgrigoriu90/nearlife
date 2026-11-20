import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View, Text } from 'react-native';
import { createTranslator } from '../../lib/i18n';
import {
  DEFAULT_TIMING,
  EASY_TIMING,
  evaluateTiming,
  type TimingConfig,
  type TimingResult,
} from '../../lib/minigame/timing';
import MinigameShell, { type ShellResult } from './MinigameShell';
import { type MinigameProps } from './types';

// Bird "tap when it dives" timing minigame (T-033 → T-069 · GDD §4). A ring shrinks and loops;
// the player taps once when it lines up with the fixed target ring. Grading is the tested,
// render-free core (lib/minigame/timing.ts, T-114) — this component only drives the visual.
// One-thumb, a few loops within a 12s budget, clear success/fail feedback. The shrink loop runs
// on the native driver (T-366 · review I-06): React does not re-render while the ring moves, and
// the tap is graded from the clock, not from the drawn ring. NOTE: not device-verified.

const CYCLE_MS = 2200; // one shrink loop
const TARGET_MS = 1500; // point in the loop the ring meets the target
const MAX_MS = 12000; // give-up budget → auto-miss
const START_SCALE = 2.6;
const END_SCALE = 0.25;
const TARGET_SCALE = START_SCALE + (END_SCALE - START_SCALE) * (TARGET_MS / CYCLE_MS);

/** Grade → 0–1 score for the shared shell (perfect ≥ 0.85 shows "Perfect!"). */
function scoreOf(result: TimingResult): number {
  return result.grade === 'perfect' ? 1 : result.grade === 'good' ? 0.6 : 0.2;
}

export default function TimingRingMinigame({
  locale = 'en',
  config: given = DEFAULT_TIMING,
  easy = false,
  onComplete,
  onCancel,
  onRetry,
  glyph,
}: MinigameProps & { config?: TimingConfig }) {
  // Easy mode (T-331 · review I-25): the forgiving tuning, whatever config was passed.
  const config = easy ? EASY_TIMING : given;
  const tr = createTranslator(locale);
  // One loop of the shrink, 0 → 1, repeated on the native thread.
  const cycle = useState(() => new Animated.Value(0))[0];
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);
  const [result, setResult] = useState<ShellResult | null>(null);
  const startRef = useRef(0);
  const budgetRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stop = () => {
    loopRef.current?.stop();
    if (budgetRef.current) clearTimeout(budgetRef.current);
    loopRef.current = null;
    budgetRef.current = null;
  };

  const finish = (timing: TimingResult) =>
    setResult((prev) => prev ?? { success: timing.success, score: scoreOf(timing) });

  useEffect(() => {
    startRef.current = Date.now();
    loopRef.current = Animated.loop(
      Animated.timing(cycle, { toValue: 1, duration: CYCLE_MS, easing: Easing.linear, useNativeDriver: true }),
    );
    loopRef.current.start();
    // No tap within the budget → a forced miss (tap far from the target). Easy mode has no budget.
    if (easy) return stop;
    budgetRef.current = setTimeout(() => {
      finish(evaluateTiming(TARGET_MS, TARGET_MS + config.goodWindowMs + 999, config));
      stop();
    }, MAX_MS);
    return stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onTap = () => {
    if (result) return;
    const inCycle = (Date.now() - startRef.current) % CYCLE_MS;
    stop();
    finish(evaluateTiming(TARGET_MS, inCycle, config));
  };

  return (
    <MinigameShell
      locale={locale}
      instruction={tr('minigame.bird.instruction')}
      hint={tr('minigame.bird.hint')}
      result={result}
      onComplete={() => result && onComplete({ success: result.success, score: result.score })}
      onCancel={onCancel}
      onRetry={onRetry}
    >
      <Pressable
        style={styles.tapLayer}
        onPress={onTap}
        accessibilityRole="button"
        accessibilityLabel={tr('minigame.bird.hint')}
      >
        <View style={[styles.targetRing, { transform: [{ scale: TARGET_SCALE }] }]} />
        <Animated.View
          style={[styles.ring, { transform: [{ scale: cycle.interpolate({ inputRange: [0, 1], outputRange: [START_SCALE, END_SCALE] }) }] }]}
        />
        <Text style={styles.diver}>{glyph ?? '🐦'}</Text>
      </Pressable>
    </MinigameShell>
  );
}

const RING = 96;
const styles = StyleSheet.create({
  tapLayer: { width: RING * 3, height: RING * 3, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: RING, height: RING, borderRadius: RING / 2, borderWidth: 4, borderColor: '#8fe3a1' },
  targetRing: { position: 'absolute', width: RING, height: RING, borderRadius: RING / 2, borderWidth: 3, borderColor: '#3a7d44', borderStyle: 'dashed' },
  diver: { fontSize: 34 },
});
