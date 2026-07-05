import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { createTranslator, type Locale, type TranslationKey } from '../../lib/i18n';
import {
  DEFAULT_TIMING,
  evaluateTiming,
  type TimingConfig,
  type TimingResult,
} from '../../lib/minigame/timing';

// Bird "tap when it dives" timing minigame (T-033 · GDD §4). A ring shrinks and loops; the
// player taps once when it lines up with the fixed target ring. The grading is the tested,
// render-free core (lib/minigame/timing.ts, T-114) — this component only drives the visual and
// reports a result. One-thumb, ~a few loops within a 12s budget, clear success/fail feedback.
// Reskinned per category by the production framework (T-069). NOTE: not device-verified.

const CYCLE_MS = 2200; // one shrink loop
const TARGET_MS = 1500; // point in the loop the ring meets the target
const MAX_MS = 12000; // give-up budget → auto-miss
const START_SCALE = 2.6;
const END_SCALE = 0.25;
const TARGET_SCALE = START_SCALE + (END_SCALE - START_SCALE) * (TARGET_MS / CYCLE_MS);

const GRADE_KEY: Record<TimingResult['grade'], TranslationKey> = {
  perfect: 'minigame.grade.perfect',
  good: 'minigame.grade.good',
  miss: 'minigame.grade.miss',
};

export interface MinigameOutcome {
  success: boolean;
  result: TimingResult;
}

export default function TimingRingMinigame({
  locale = 'en',
  config = DEFAULT_TIMING,
  onComplete,
  onCancel,
}: {
  locale?: Locale;
  config?: TimingConfig;
  onComplete: (outcome: MinigameOutcome) => void;
  onCancel?: () => void;
}) {
  const tr = createTranslator(locale);
  const [scale, setScale] = useState(START_SCALE);
  const [result, setResult] = useState<TimingResult | null>(null);
  const startRef = useRef(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const budgetRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stop = () => {
    if (tickRef.current) clearInterval(tickRef.current);
    if (budgetRef.current) clearTimeout(budgetRef.current);
    tickRef.current = null;
    budgetRef.current = null;
  };

  useEffect(() => {
    startRef.current = Date.now();
    tickRef.current = setInterval(() => {
      const inCycle = (Date.now() - startRef.current) % CYCLE_MS;
      setScale(START_SCALE + (END_SCALE - START_SCALE) * (inCycle / CYCLE_MS));
    }, 30);
    // No tap within the budget → a forced miss (tap far from the target).
    budgetRef.current = setTimeout(() => {
      setResult((prev) => prev ?? evaluateTiming(TARGET_MS, TARGET_MS + config.goodWindowMs + 999, config));
      stop();
    }, MAX_MS);
    return stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onTap = () => {
    if (result) return;
    const inCycle = (Date.now() - startRef.current) % CYCLE_MS;
    stop();
    setResult(evaluateTiming(TARGET_MS, inCycle, config));
  };

  if (result) {
    return (
      <View style={styles.container}>
        <View style={styles.resultBlock}>
          <Text style={styles.grade}>{tr(GRADE_KEY[result.grade])}</Text>
          <Text style={[styles.outcome, result.success ? styles.win : styles.lose]}>
            {result.success ? tr('minigame.success') : tr('minigame.fail')}
          </Text>
        </View>
        <Pressable
          style={styles.cta}
          onPress={() => onComplete({ success: result.success, result })}
          accessibilityRole="button"
        >
          <Text style={styles.ctaText}>{tr('minigame.continue')}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <Pressable style={styles.container} onPress={onTap} accessibilityRole="button">
      <Text style={styles.instruction}>{tr('minigame.instruction')}</Text>
      <View style={styles.stage}>
        <View style={[styles.targetRing, { transform: [{ scale: TARGET_SCALE }] }]} />
        <View style={[styles.ring, { transform: [{ scale }] }]} />
        <Text style={styles.diver}>🐦</Text>
      </View>
      <Text style={styles.tapHint}>{tr('minigame.tapHint')}</Text>
      {onCancel ? (
        <Pressable onPress={onCancel} accessibilityRole="button" style={styles.cancel}>
          <Text style={styles.cancelText}>{tr('minigame.cancel')}</Text>
        </Pressable>
      ) : null}
    </Pressable>
  );
}

const RING = 96;
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0e1f14', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  instruction: { position: 'absolute', top: 96, fontSize: 16, color: '#dbe7dc', textAlign: 'center', paddingHorizontal: 24 },
  stage: { width: RING * 3, height: RING * 3, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: RING, height: RING, borderRadius: RING / 2, borderWidth: 4, borderColor: '#8fe3a1' },
  targetRing: { position: 'absolute', width: RING, height: RING, borderRadius: RING / 2, borderWidth: 3, borderColor: '#3a7d44', borderStyle: 'dashed' },
  diver: { fontSize: 34 },
  tapHint: { position: 'absolute', bottom: 120, fontSize: 13, color: '#7fa588', letterSpacing: 2 },
  cancel: { position: 'absolute', bottom: 56 },
  cancelText: { fontSize: 14, color: '#7fa588' },
  resultBlock: { alignItems: 'center' },
  grade: { fontSize: 22, color: '#dbe7dc', marginBottom: 8 },
  outcome: { fontSize: 34, fontWeight: '800' },
  win: { color: '#8fe3a1' },
  lose: { color: '#e39a8f' },
  cta: { position: 'absolute', bottom: 56, left: 24, right: 24, paddingVertical: 16, borderRadius: 14, backgroundColor: '#3a7d44', alignItems: 'center' },
  ctaText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
