import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { createTranslator, type Locale } from '../lib/i18n';
import type { Region } from '../lib/hometown';
import type { MoveCheck, MoveResult } from '../lib/homeMove';

// "I've moved" (T-349 · review F-09): one fix, the county it finds, a confirmation, once a year.

type Step =
  | { kind: 'locating' }
  | { kind: 'checked'; check: MoveCheck }
  | { kind: 'saving' }
  | { kind: 'done'; region: Region }
  | { kind: 'refused'; nextDate: string | null }
  | { kind: 'failed' };

export default function MoveHomeScreen({
  locale,
  current,
  check,
  onConfirm,
  onDone,
}: {
  locale: Locale;
  current: Region;
  check: () => Promise<MoveCheck>;
  onConfirm: (region: Region) => Promise<MoveResult>;
  onDone: () => void;
}) {
  const tr = createTranslator(locale);
  const [step, setStep] = useState<Step>({ kind: 'locating' });

  useEffect(() => {
    let live = true;
    void check()
      .then((c) => live && setStep({ kind: 'checked', check: c }))
      .catch(() => live && setStep({ kind: 'checked', check: { kind: 'no-fix' } }));
    return () => {
      live = false;
    };
  }, [check]);

  const confirm = (region: Region) => {
    setStep({ kind: 'saving' });
    void onConfirm(region)
      .then((r) => setStep(r.ok ? { kind: 'done', region } : { kind: 'refused', nextDate: r.nextDate }))
      .catch(() => setStep({ kind: 'failed' }));
  };

  let body: React.ReactNode;
  if (step.kind === 'locating' || step.kind === 'saving') {
    body = <ActivityIndicator color="#3a7d44" />;
  } else if (step.kind === 'done') {
    body = <Text style={styles.text}>{tr('move.done', { county: step.region.name })}</Text>;
  } else if (step.kind === 'refused') {
    body = (
      <Text style={styles.text}>
        {step.nextDate ? tr('move.refused', { date: step.nextDate }) : tr('move.refusedNoDate')}
      </Text>
    );
  } else if (step.kind === 'failed') {
    body = <Text style={styles.text}>{tr('move.failed')}</Text>;
  } else if (step.check.kind === 'move') {
    const region = step.check.region;
    body = (
      <>
        <Text style={styles.text}>{tr('move.confirm', { from: current.name, to: region.name })}</Text>
        <Text style={styles.note}>{tr('move.onceAYear')}</Text>
        <Pressable onPress={() => confirm(region)} accessibilityRole="button" style={styles.cta}>
          <Text style={styles.ctaText}>{tr('move.cta', { county: region.name })}</Text>
        </Pressable>
      </>
    );
  } else {
    const key = step.check.kind === 'same' ? 'move.same' : step.check.kind === 'outside-sweden' ? 'move.outside' : 'move.noFix';
    body = <Text style={styles.text}>{tr(key, { county: current.name })}</Text>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{tr('move.title')}</Text>
        <Pressable onPress={onDone} accessibilityRole="button">
          <Text style={styles.done}>{tr('settings.done')}</Text>
        </Pressable>
      </View>
      <View style={styles.card}>{body}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f8f2', paddingTop: 56, paddingHorizontal: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '700', color: '#2f5d34' },
  done: { fontSize: 16, fontWeight: '600', color: '#336f3c' },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 18, gap: 12 },
  text: { fontSize: 16, lineHeight: 23, color: '#22331f' },
  note: { fontSize: 13, lineHeight: 19, color: '#566658' },
  cta: { backgroundColor: '#3a7d44', borderRadius: 22, paddingVertical: 12, alignItems: 'center' },
  ctaText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
