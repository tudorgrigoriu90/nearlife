import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type GestureResponderEvent } from 'react-native';
import { createTranslator } from '../../lib/i18n';
import { DEFAULT_FRAME, evaluateFrame, type FrameConfig } from '../../lib/minigame/frame';
import MinigameShell, { type ShellResult } from './MinigameShell';
import { type MinigameProps } from './types';

// Plant/fungus "spot & frame" minigame (T-073 · GDD §4). Find the subject among look-alikes and
// drag the frame onto it, then capture. Accuracy falls off with distance from the subject centre;
// grading is the tested render-free core (lib/minigame/frame.ts). No photo required. One-thumb,
// no timer (spotting is the challenge). NOTE: not device-verified.

const STAGE = 288;
const RETICLE = 96;
const TARGET_RADIUS = 84; // generous "on it" radius fed to the frame core

// Deterministic layout: one subject among decoys. Positions are fractions of the stage.
const SUBJECT = { x: STAGE * 0.66, y: STAGE * 0.32, glyph: '🌸' };
const DECOYS = [
  { x: STAGE * 0.28, y: STAGE * 0.7, glyph: '🌿' },
  { x: STAGE * 0.74, y: STAGE * 0.76, glyph: '🍃' },
  { x: STAGE * 0.2, y: STAGE * 0.26, glyph: '🌱' },
];

export default function FrameMinigame({
  locale = 'en',
  config = DEFAULT_FRAME,
  onComplete,
  onCancel,
}: MinigameProps & { config?: FrameConfig }) {
  const tr = createTranslator(locale);
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
    >
      <View
        style={styles.stage}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={move}
        onResponderMove={move}
      >
        {DECOYS.map((d, i) => (
          <Text key={i} style={[styles.subject, { left: d.x - 15, top: d.y - 15 }]}>
            {d.glyph}
          </Text>
        ))}
        <Text style={[styles.subject, { left: SUBJECT.x - 15, top: SUBJECT.y - 15 }]}>{SUBJECT.glyph}</Text>
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
