import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { createTranslator } from '../../lib/i18n';
import { DEFAULT_RHYTHM, evaluateRhythm, type RhythmConfig } from '../../lib/minigame/rhythm';
import MinigameShell, { type ShellResult } from './MinigameShell';
import { type MinigameProps } from './types';

// Fish "rhythm & tension" reel minigame (T-070 · GDD §4). A fish darts up and down a vertical
// track; the player holds to reel the sweet-zone band upward and releases to let it sink, keeping
// the fish inside the band. Each tick samples whether the fish was in the band; grading is the
// tested render-free core (lib/minigame/rhythm.ts). One-thumb, ~11s. NOTE: not device-verified.

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

export default function FishReelMinigame({
  locale = 'en',
  config = DEFAULT_RHYTHM,
  onComplete,
  onCancel,
}: MinigameProps & { config?: RhythmConfig }) {
  const tr = createTranslator(locale);
  const [bandTop, setBandTop] = useState(TRACK_H - BAND_H);
  const [fishTop, setFishTop] = useState(CENTER - FISH / 2);
  const [result, setResult] = useState<ShellResult | null>(null);
  const holdingRef = useRef(false);
  const bandRef = useRef(TRACK_H - BAND_H);
  const inZoneRef = useRef(0);
  const totalRef = useRef(0);
  const startRef = useRef(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    startRef.current = Date.now();
    tickRef.current = setInterval(() => {
      const elapsed = Date.now() - startRef.current;
      // Move the band: reel up while held, sink under gravity when released.
      const next = holdingRef.current ? bandRef.current - REEL_UP : bandRef.current + GRAVITY;
      bandRef.current = Math.max(0, Math.min(TRACK_H - BAND_H, next));
      setBandTop(bandRef.current);

      const fishCenter = fishCenterAt(elapsed);
      setFishTop(fishCenter - FISH / 2);

      totalRef.current += 1;
      const inZone = fishCenter >= bandRef.current && fishCenter <= bandRef.current + BAND_H;
      if (inZone) inZoneRef.current += 1;

      if (elapsed >= DURATION_MS) {
        if (tickRef.current) clearInterval(tickRef.current);
        tickRef.current = null;
        const r = evaluateRhythm(inZoneRef.current, totalRef.current, config);
        setResult({ success: r.success, score: r.ratio });
      }
    }, TICK_MS);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fishInBand = fishTop + FISH / 2 >= bandTop && fishTop + FISH / 2 <= bandTop + BAND_H;

  return (
    <MinigameShell
      locale={locale}
      instruction={tr('minigame.fish.instruction')}
      hint={tr('minigame.fish.hint')}
      result={result}
      onComplete={() => result && onComplete({ success: result.success, score: result.score })}
      onCancel={onCancel}
    >
      <Pressable
        style={styles.track}
        onPressIn={() => (holdingRef.current = true)}
        onPressOut={() => (holdingRef.current = false)}
        accessibilityRole="button"
      >
        <View style={[styles.band, fishInBand ? styles.bandHot : null, { top: bandTop }]} />
        <Text style={[styles.fish, { top: fishTop }]}>🐟</Text>
      </Pressable>
    </MinigameShell>
  );
}

const styles = StyleSheet.create({
  track: { width: 96, height: TRACK_H, borderRadius: 20, backgroundColor: '#0a1710', borderWidth: 2, borderColor: '#1c3a28', overflow: 'hidden' },
  band: { position: 'absolute', left: 6, right: 6, height: BAND_H, borderRadius: 12, borderWidth: 2, borderColor: '#3a7d44', backgroundColor: 'rgba(58,125,68,0.25)' },
  bandHot: { borderColor: '#8fe3a1', backgroundColor: 'rgba(143,227,161,0.35)' },
  fish: { position: 'absolute', left: 33, fontSize: FISH, height: FISH, lineHeight: FISH },
});
