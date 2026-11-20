import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet } from 'react-native';
import { createTranslator } from '../../lib/i18n';
import { DEFAULT_RHYTHM, EASY_RHYTHM, evaluateRhythm, type RhythmConfig } from '../../lib/minigame/rhythm';
import { sampledPath } from '../../lib/minigame/motion';
import MinigameShell, { type ShellResult } from './MinigameShell';
import { type MinigameProps } from './types';

// Fish "rhythm & tension" reel minigame (T-070 · GDD §4). A fish darts up and down a vertical
// track; the player holds to reel the sweet-zone band upward and releases to let it sink, keeping
// the fish inside the band. Each tick samples whether the fish was in the band; grading is the
// tested render-free core (lib/minigame/rhythm.ts). One-thumb, ~11s. Motion does not re-render
// React (T-366 · review I-06): the fish's drift is a native-driver path over time; the band, on
// each press or release, starts a native-driver glide at the same speed the scoring tick uses;
// the band's "fish inside" colour changes at most every 200 ms.
// NOTE: not device-verified.

const TRACK_H = 288;
const BAND_H = 78;
const FISH = 30;
const TICK_MS = 60;
const DURATION_MS = 11000;
const REEL_UP = 2.6; // px/tick while holding
const GRAVITY = 1.7; // px/tick while released
const CENTER = TRACK_H / 2;

/** Deterministic, organic-feeling fish drift — two summed sines, no randomness. */
function fishCenterAt(elapsedMs: number): number {
  const t = elapsedMs / 1000;
  const amp = (TRACK_H - FISH) / 2 - 6;
  const wander = 0.62 * Math.sin(t * 1.7) + 0.38 * Math.sin(t * 3.1 + 0.9);
  return CENTER + amp * wander;
}

// The fish's drift for the native driver, sampled every 50 ms (within a pixel of the sines).
const FISH_PATH = sampledPath((ms) => fishCenterAt(ms) - FISH / 2, DURATION_MS, 50);

export default function FishReelMinigame({
  locale = 'en',
  config: given = DEFAULT_RHYTHM,
  easy = false,
  onComplete,
  onCancel,
  onRetry,
  glyph,
}: MinigameProps & { config?: RhythmConfig }) {
  // Easy mode (T-331 · review I-25): the forgiving tuning, whatever config was passed.
  const config = easy ? EASY_RHYTHM : given;
  const tr = createTranslator(locale);
  const clock = useState(() => new Animated.Value(0))[0];
  const bandY = useState(() => new Animated.Value(TRACK_H - BAND_H))[0];
  const [fishInBand, setFishInBand] = useState(false);
  const glideRef = useRef<Animated.CompositeAnimation | null>(null);
  // Reel up while held, sink while released, from where the scoring tick has the band now.
  const glide = (holding: boolean) => {
    holdingRef.current = holding;
    glideRef.current?.stop();
    const from = bandRef.current;
    const to = holding ? 0 : TRACK_H - BAND_H;
    const pxPerTick = holding ? REEL_UP : GRAVITY;
    bandY.setValue(from);
    glideRef.current = Animated.timing(bandY, {
      toValue: to,
      duration: (Math.abs(to - from) / pxPerTick) * TICK_MS,
      easing: Easing.linear,
      useNativeDriver: true,
    });
    glideRef.current.start();
  };
  const hotRef = useRef({ value: false, at: 0 });
  const [result, setResult] = useState<ShellResult | null>(null);
  const holdingRef = useRef(false);
  const bandRef = useRef(TRACK_H - BAND_H);
  const inZoneRef = useRef(0);
  const totalRef = useRef(0);
  const startRef = useRef(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    startRef.current = Date.now();
    const drift = Animated.timing(clock, {
      toValue: DURATION_MS,
      duration: DURATION_MS,
      easing: Easing.linear,
      useNativeDriver: true,
    });
    drift.start();
    tickRef.current = setInterval(() => {
      const elapsed = Date.now() - startRef.current;
      // Move the band: reel up while held, sink under gravity when released.
      const next = holdingRef.current ? bandRef.current - REEL_UP : bandRef.current + GRAVITY;
      bandRef.current = Math.max(0, Math.min(TRACK_H - BAND_H, next));

      const fishCenter = fishCenterAt(elapsed);

      totalRef.current += 1;
      const inZone = fishCenter >= bandRef.current && fishCenter <= bandRef.current + BAND_H;
      if (inZone) inZoneRef.current += 1;
      // The colour cue: re-render only when it changes, and not more often than every 200 ms.
      if (inZone !== hotRef.current.value && elapsed - hotRef.current.at >= 200) {
        hotRef.current = { value: inZone, at: elapsed };
        setFishInBand(inZone);
      }

      if (elapsed >= DURATION_MS) {
        if (tickRef.current) clearInterval(tickRef.current);
        tickRef.current = null;
        const r = evaluateRhythm(inZoneRef.current, totalRef.current, config);
        setResult({ success: r.success, score: r.ratio });
      }
    }, TICK_MS);
    return () => {
      drift.stop();
      glideRef.current?.stop();
      if (tickRef.current) clearInterval(tickRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <MinigameShell
      locale={locale}
      instruction={tr('minigame.fish.instruction')}
      hint={tr('minigame.fish.hint')}
      result={result}
      onComplete={() => result && onComplete({ success: result.success, score: result.score })}
      onCancel={onCancel}
      onRetry={onRetry}
    >
      <Pressable
        style={styles.track}
        onPressIn={() => glide(true)}
        onPressOut={() => glide(false)}
        accessibilityRole="button"
        accessibilityLabel={tr('minigame.fish.hint')}
      >
        <Animated.View style={[styles.band, fishInBand ? styles.bandHot : null, { transform: [{ translateY: bandY }] }]} />
        <Animated.Text style={[styles.fish, { transform: [{ translateY: clock.interpolate(FISH_PATH) }] }]}>
          {glyph ?? '🐟'}
        </Animated.Text>
      </Pressable>
    </MinigameShell>
  );
}

const styles = StyleSheet.create({
  track: { width: 96, height: TRACK_H, borderRadius: 20, backgroundColor: '#0a1710', borderWidth: 2, borderColor: '#1c3a28', overflow: 'hidden' },
  band: { position: 'absolute', top: 0, left: 6, right: 6, height: BAND_H, borderRadius: 12, borderWidth: 2, borderColor: '#3a7d44', backgroundColor: 'rgba(58,125,68,0.25)' },
  bandHot: { borderColor: '#8fe3a1', backgroundColor: 'rgba(143,227,161,0.35)' },
  fish: { position: 'absolute', top: 0, left: 33, fontSize: FISH, height: FISH, lineHeight: FISH },
});
