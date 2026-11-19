import { useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type GestureResponderEvent } from 'react-native';
import { createTranslator } from '../../lib/i18n';
import { DEFAULT_FRAME, EASY_FRAME, evaluateFrame, frameLayout, type FrameConfig } from '../../lib/minigame/frame';
import MinigameShell, { type ShellResult } from './MinigameShell';
import { type MinigameProps } from './types';

// Plant/fungus "spot & frame" minigame (T-073 · GDD §4). Find the subject among look-alikes and
// drag the frame onto it, then capture. Accuracy falls off with distance from the subject centre;
// grading is the tested render-free core (lib/minigame/frame.ts). No photo required. One-thumb,
// no timer (spotting is the challenge). NOTE: not device-verified.

const STAGE = 288;
const RETICLE = 96;
const TARGET_RADIUS = 84; // generous "on it" radius fed to the frame core

// One subject among three decoys; where they sit comes from the seed (species and day, T-321).
const DECOY_GLYPHS = ['🌿', '🍃', '🌱'];
const DEFAULT_SEED = 1;

export default function FrameMinigame({
  locale = 'en',
  config: given = DEFAULT_FRAME,
  easy = false,
  onComplete,
  onCancel,
  onRetry,
  glyph,
  seed,
}: MinigameProps & { config?: FrameConfig }) {
  // Easy mode (T-331 · review I-25): the forgiving tuning, whatever config was passed.
  const config = easy ? EASY_FRAME : given;
  const tr = createTranslator(locale);
  const layout = useMemo(() => frameLayout(seed ?? DEFAULT_SEED, STAGE), [seed]);
  const SUBJECT = { ...layout.subject, glyph: glyph ?? '🌸' };
  const DECOYS = layout.decoys.map((p, i) => ({ ...p, glyph: DECOY_GLYPHS[i] }));
  const [reticle, setReticle] = useState({ x: STAGE / 2, y: STAGE / 2 });
  const [result, setResult] = useState<ShellResult | null>(null);
  const reticleRef = useRef(reticle);

  // View touch-event props (recognised as event handlers by the React Compiler, unlike a
  // PanResponder config) drag the reticle; the placement is mirrored into a ref for capture.
  const move = (e: GestureResponderEvent) => {
    const clamped = {
      x: Math.max(RETICLE / 2, Math.min(STAGE - RETICLE / 2, e.nativeEvent.locationX)),
      y: Math.max(RETICLE / 2, Math.min(STAGE - RETICLE / 2, e.nativeEvent.locationY)),
    };
    reticleRef.current = clamped;
    setReticle(clamped);
  };

  const capture = () => {
    const d = Math.hypot(reticleRef.current.x - SUBJECT.x, reticleRef.current.y - SUBJECT.y);
    const r = evaluateFrame(d, TARGET_RADIUS, config);
    setResult({ success: r.success, score: r.accuracy });
  };

  return (
    <MinigameShell
      locale={locale}
      instruction={tr('minigame.plant.instruction')}
      result={result}
      onComplete={() => result && onComplete({ success: result.success, score: result.score })}
      onCancel={onCancel}
      onRetry={onRetry}
    >
      <View
        testID="frame-stage"
        style={styles.stage}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={move}
        onResponderMove={move}
      >
        {DECOYS.map((d, i) => (
          <Text key={i} pointerEvents="none" style={[styles.subject, { left: d.x - 15, top: d.y - 15 }]}>
            {d.glyph}
          </Text>
        ))}
        <Text pointerEvents="none" style={[styles.subject, { left: SUBJECT.x - 15, top: SUBJECT.y - 15 }]}>
          {SUBJECT.glyph}
        </Text>
        <View style={[styles.reticle, { left: reticle.x - RETICLE / 2, top: reticle.y - RETICLE / 2 }]} pointerEvents="none" />
      </View>
      <Pressable style={styles.capture} onPress={capture} accessibilityRole="button">
        <Text style={styles.captureText}>{tr('minigame.plant.capture')}</Text>
      </Pressable>
    </MinigameShell>
  );
}

const styles = StyleSheet.create({
  stage: { width: STAGE, height: STAGE, borderRadius: 24, backgroundColor: '#0a1710', borderWidth: 2, borderColor: '#1c3a28', overflow: 'hidden' },
  subject: { position: 'absolute', width: 30, height: 30, fontSize: 26, lineHeight: 30, textAlign: 'center' },
  reticle: { position: 'absolute', width: RETICLE, height: RETICLE, borderRadius: 12, borderWidth: 3, borderColor: '#8fe3a1' },
  capture: { position: 'absolute', bottom: -40, paddingVertical: 16, paddingHorizontal: 44, borderRadius: 16, backgroundColor: '#3a7d44' },
  captureText: { fontSize: 16, fontWeight: '700', color: '#fff', letterSpacing: 1 },
});
