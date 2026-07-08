import { type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { createTranslator, type Locale, type TranslationKey } from '../../lib/i18n';
import { gradeFromScore, type MinigameGrade } from '../../lib/minigame/grade';

// Shared chrome for every category minigame (T-069 · GDD §4): the dark stage, the instruction
// line, an optional hint, a cancel affordance, and the win/lose result screen with a Continue
// CTA. Each category component supplies its own interactive stage as children and, when the game
// is over, a `result` — keeping the per-category files focused on their unique mechanic.

const GRADE_KEY: Record<MinigameGrade, TranslationKey> = {
  perfect: 'minigame.grade.perfect',
  good: 'minigame.grade.good',
  miss: 'minigame.grade.miss',
};

export interface ShellResult {
  success: boolean;
  /** 0–1; picks the flavour copy (perfect / good / miss). */
  score: number;
}

export default function MinigameShell({
  locale = 'en',
  instruction,
  hint,
  result,
  onComplete,
  onCancel,
  children,
}: {
  locale?: Locale;
  instruction: string;
  hint?: string;
  /** null while playing; set to end the game and show the result screen. */
  result: ShellResult | null;
  onComplete: () => void;
  onCancel?: () => void;
  children: ReactNode;
}) {
  const tr = createTranslator(locale);

  if (result) {
    return (
      <View style={styles.container}>
        <View style={styles.resultBlock}>
          <Text style={styles.grade}>{tr(GRADE_KEY[gradeFromScore(result.success, result.score)])}</Text>
          <Text style={[styles.outcome, result.success ? styles.win : styles.lose]}>
            {result.success ? tr('minigame.success') : tr('minigame.fail')}
          </Text>
        </View>
        <Pressable style={styles.cta} onPress={onComplete} accessibilityRole="button">
          <Text style={styles.ctaText}>{tr('minigame.continue')}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.instruction}>{instruction}</Text>
      <View style={styles.stage}>{children}</View>
      {hint ? <Text style={styles.tapHint}>{hint}</Text> : null}
      {onCancel ? (
        <Pressable onPress={onCancel} accessibilityRole="button" style={styles.cancel}>
          <Text style={styles.cancelText}>{tr('minigame.cancel')}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const RING = 96;
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0e1f14', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  instruction: { position: 'absolute', top: 96, fontSize: 16, color: '#dbe7dc', textAlign: 'center', paddingHorizontal: 24 },
  stage: { width: RING * 3, height: RING * 3, alignItems: 'center', justifyContent: 'center' },
  tapHint: { position: 'absolute', bottom: 120, fontSize: 13, color: '#7fa588', letterSpacing: 2, textAlign: 'center', paddingHorizontal: 24 },
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
