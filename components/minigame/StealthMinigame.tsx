import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { createTranslator } from '../../lib/i18n';
import {
  DEFAULT_STEALTH,
  evaluateStealth,
  type StealthConfig,
  type StealthTick,
} from '../../lib/minigame/stealth';
import MinigameShell, { type ShellResult } from './MinigameShell';
import { type MinigameProps } from './types';

// Mammal "stealth" minigame (T-072 · GDD §4). Hold to creep closer; release to freeze the moment
// it looks up. Move while it is alert and you are spotted (instant fail). A brief telegraph warns
// before it turns, so the game is fair. Progress accrues on safe advances; grading is the tested
// render-free core (lib/minigame/stealth.ts). One-thumb, ~12s. NOTE: not device-verified.

const CYCLE_MS = 4400;
const WARN_AT = 2400; // telegraph starts (it is about to look up)
const ALERT_AT = 3000; // it is now looking — moving here gets you spotted
const TICK_MS = 200;
const MAX_MS = 20000; // give-up budget

type Phase = 'calm' | 'warn' | 'alert';

function phaseAt(elapsedMs: number): Phase {
  const p = elapsedMs % CYCLE_MS;
  if (p < WARN_AT) return 'calm';
  if (p < ALERT_AT) return 'warn';
  return 'alert';
}

export default function StealthMinigame({
  locale = 'en',
  config = DEFAULT_STEALTH,
  onComplete,
  onCancel,
}: MinigameProps & { config?: StealthConfig }) {
  const tr = createTranslator(locale);
  const [phase, setPhase] = useState<Phase>('calm');
  const [progress, setProgress] = useState(0);
  const [holding, setHolding] = useState(false);
  const [result, setResult] = useState<ShellResult | null>(null);
  const holdingRef = useRef(false);
  const ticksRef = useRef<StealthTick[]>([]);
  const startRef = useRef(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    startRef.current = Date.now();
    tickRef.current = setInterval(() => {
      const elapsed = Date.now() - startRef.current;
      const ph = phaseAt(elapsed);
      setPhase(ph);

      ticksRef.current.push({ moving: holdingRef.current, alert: ph === 'alert' });
      const r = evaluateStealth(ticksRef.current, config);
      setProgress(r.progress);

      const timedOut = elapsed >= MAX_MS;
      if (r.spotted || r.success || timedOut) {
        if (tickRef.current) clearInterval(tickRef.current);
        tickRef.current = null;
        setResult({ success: r.success, score: Math.min(1, r.progress / config.progressNeeded) });
      }
    }, TICK_MS);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pct = Math.min(1, progress / config.progressNeeded);

  return (
    <MinigameShell
      locale={locale}
      instruction={tr('minigame.mammal.instruction')}
      hint={tr(holding ? 'minigame.mammal.hint.moving' : 'minigame.mammal.hint.frozen')}
      result={result}
      onComplete={() => result && onComplete({ success: result.success, score: result.score })}
      onCancel={onCancel}
    >
      <View style={styles.scene}>
        <Text style={styles.animal}>{phase === 'calm' ? '🦊' : phase === 'warn' ? '🦊❔' : '🦊👀'}</Text>
        <Text style={[styles.state, phase === 'alert' ? styles.alert : phase === 'warn' ? styles.warn : styles.safe]}>
          {tr(phase === 'alert' ? 'minigame.mammal.watching' : phase === 'warn' ? 'minigame.mammal.turning' : 'minigame.mammal.grazing')}
        </Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${pct * 100}%` }]} />
        </View>
      </View>
      <Pressable
        style={styles.creepBtn}
        onPressIn={() => {
          holdingRef.current = true;
          setHolding(true);
        }}
        onPressOut={() => {
          holdingRef.current = false;
          setHolding(false);
        }}
        accessibilityRole="button"
      >
        <Text style={styles.creepText}>{tr(holding ? 'minigame.mammal.creeping' : 'minigame.mammal.holdToCreep')}</Text>
      </Pressable>
    </MinigameShell>
  );
}

const styles = StyleSheet.create({
  scene: { alignItems: 'center' },
  animal: { fontSize: 64, marginBottom: 12 },
  state: { fontSize: 15, fontWeight: '700', marginBottom: 16 },
  safe: { color: '#8fe3a1' },
  warn: { color: '#e3d08f' },
  alert: { color: '#e39a8f' },
  progressTrack: { width: 220, height: 12, borderRadius: 6, backgroundColor: '#0a1710', borderWidth: 1, borderColor: '#1c3a28', overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#3a7d44' },
  creepBtn: { position: 'absolute', bottom: -40, paddingVertical: 18, paddingHorizontal: 48, borderRadius: 16, backgroundColor: '#1c3a28', borderWidth: 2, borderColor: '#3a7d44' },
  creepText: { fontSize: 16, fontWeight: '700', color: '#dbe7dc', letterSpacing: 1 },
});
