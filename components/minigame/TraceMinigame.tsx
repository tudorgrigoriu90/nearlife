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
  const track = (e: GestureResponderEvent) =>
    (fingerRef.current = { x: e.nativeEvent.locationX, y: e.nativeEvent.locationY });
  const clearFinger = () => (fingerRef.current = null);

  useEffect(() => {
    startRef.current = Date.now();
    tickRef.current = setInterval(() => {
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
    >
      <View
        style={styles.stage}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={track}
        onResponderMove={track}
        onResponderRelease={clearFinger}
        onResponderTerminate={clearFinger}
      >
        <Text style={[styles.bug, onPath ? styles.bugOn : null, { left: bug.x - BUG / 2, top: bug.y - BUG / 2 }]}>
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
});
