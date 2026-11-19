import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, type GestureResponderEvent } from 'react-native';
import { createTranslator } from '../../lib/i18n';
import { DEFAULT_TRACE, evaluateTrace, type TraceConfig } from '../../lib/minigame/trace';
import MinigameShell, { type ShellResult } from './MinigameShell';
import { type MinigameProps } from './types';

// Insect "trace" minigame (T-071 · GDD §4). A flying insect traces a looping path; the player
// keeps a fingertip on it without letting the line break. Each tick samples the distance between
// finger and insect; grading is the tested render-free core (lib/minigame/trace.ts). One-thumb,
// ~10s. NOTE: not device-verified.

const STAGE = 288;
const BUG = 30;
const TICK_MS = 60;
const DURATION_MS = 10000;
const AMP = (STAGE - BUG) / 2 - 4;
const C = STAGE / 2;
const OFF_PATH = 9999; // finger absent → counts as a break
const RING = 44; // the hit area drawn on the path: the trace tolerance
const LIFT = 40; // the insect is drawn this far above the point to follow

/** Deterministic figure-eight-ish flight path — two incommensurate sines, no randomness. */
function bugCenterAt(elapsedMs: number): { x: number; y: number } {
  const t = elapsedMs / 1000;
  return { x: C + AMP * Math.sin(t * 1.3), y: C + AMP * Math.sin(t * 2.1 + 0.5) };
}

export default function TraceMinigame({
  locale = 'en',
  config = DEFAULT_TRACE,
  onComplete,
  onCancel,
  onRetry,
}: MinigameProps & { config?: TraceConfig }) {
  const tr = createTranslator(locale);
  const [bug, setBug] = useState({ x: C, y: C });
  const [onPath, setOnPath] = useState(false);
  const [result, setResult] = useState<ShellResult | null>(null);
  const fingerRef = useRef<{ x: number; y: number } | null>(null);
  const distancesRef = useRef<number[]>([]);
  const startRef = useRef(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // View touch-event props (recognised as event handlers by the React Compiler, unlike a
  // PanResponder config) track the finger; the tick loop reads the latest position from the ref.
  // The game's clock starts at the first touch on the stage (T-277 · review B-60): reading the
  // instruction and finding the insect cost nothing.
  const track = (e: GestureResponderEvent) => {
    if (startRef.current === 0) startRef.current = Date.now();
    fingerRef.current = { x: e.nativeEvent.locationX, y: e.nativeEvent.locationY };
  };
  const clearFinger = () => (fingerRef.current = null);

  useEffect(() => {
    tickRef.current = setInterval(() => {
      if (startRef.current === 0) return; // not touched yet
      const elapsed = Date.now() - startRef.current;
      const center = bugCenterAt(elapsed);
      setBug(center);

      const f = fingerRef.current;
      const d = f ? Math.hypot(f.x - center.x, f.y - center.y) : OFF_PATH;
      distancesRef.current.push(d);
      setOnPath(d <= config.tolerancePx);

      if (elapsed >= DURATION_MS) {
        if (tickRef.current) clearInterval(tickRef.current);
        tickRef.current = null;
        const r = evaluateTrace(distancesRef.current, config);
        const total = distancesRef.current.length || 1;
        setResult({ success: r.success, score: 1 - r.breaks / total });
      }
    }, TICK_MS);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <MinigameShell
      locale={locale}
      instruction={tr('minigame.insect.instruction')}
      hint={tr('minigame.insect.hint')}
      result={result}
      onComplete={() => result && onComplete({ success: result.success, score: result.score })}
      onCancel={onCancel}
      onRetry={onRetry}
    >
      <View
        testID="trace-stage"
        style={styles.stage}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={track}
        onResponderMove={track}
        onResponderRelease={clearFinger}
        onResponderTerminate={clearFinger}
      >
        {/* The point to follow is the ring; the insect is drawn above it so the finger does not
            cover it (T-277). Children ignore touches, so positions are the stage's (B-62). */}
        <View
          pointerEvents="none"
          style={[styles.ring, onPath ? styles.ringOn : null, { left: bug.x - RING / 2, top: bug.y - RING / 2 }]}
        />
        <Text
          pointerEvents="none"
          style={[styles.bug, onPath ? styles.bugOn : null, { left: bug.x - BUG / 2, top: bug.y - BUG / 2 - LIFT }]}
        >
          🦋
        </Text>
      </View>
    </MinigameShell>
  );
}

const styles = StyleSheet.create({
  stage: { width: STAGE, height: STAGE, borderRadius: 24, backgroundColor: '#0a1710', borderWidth: 2, borderColor: '#1c3a28', overflow: 'hidden' },
  bug: { position: 'absolute', width: BUG, height: BUG, fontSize: 26, lineHeight: BUG, textAlign: 'center' },
  bugOn: { textShadowColor: '#8fe3a1', textShadowRadius: 12 },
  ring: { position: 'absolute', width: RING, height: RING, borderRadius: RING / 2, borderWidth: 2, borderColor: '#4f7d5c' },
  ringOn: { borderColor: '#8fe3a1' },
});
