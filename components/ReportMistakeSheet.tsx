import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { createTranslator, type Locale } from '../lib/i18n';
import {
  MAX_REPORT_COMMENT,
  REPORT_KINDS,
  type ReportKind,
  type ReportOutcome,
} from '../lib/contentReports';

// "Report a mistake" (T-293 · review I-32): what is wrong, an optional comment, then a plain
// answer. Nothing here is a delight moment or an upsell; the sheet only collects the report.

export default function ReportMistakeSheet({
  speciesName,
  locale = 'en',
  onSend,
  onClose,
}: {
  speciesName: string;
  locale?: Locale;
  onSend: (kind: ReportKind, comment: string) => Promise<ReportOutcome>;
  onClose: () => void;
}) {
  const tr = createTranslator(locale);
  const [kind, setKind] = useState<ReportKind | null>(null);
  const [comment, setComment] = useState('');
  const [state, setState] = useState<'editing' | 'sending' | ReportOutcome>('editing');

  const send = async () => {
    if (!kind || state === 'sending') return;
    setState('sending');
    setState(await onSend(kind, comment));
  };

  if (state === 'sent' || state === 'too-many') {
    return (
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.body}>{state === 'sent' ? tr('report.sent') : tr('report.tooMany')}</Text>
          <Pressable style={styles.cta} accessibilityRole="button" onPress={onClose}>
            <Text style={styles.ctaText}>{tr('report.close')}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.backdrop}>
      <View style={styles.sheet}>
        <Text style={styles.title}>{tr('report.title', { name: speciesName })}</Text>
        <View style={styles.kinds}>
          {REPORT_KINDS.map((k) => (
            <Pressable
              key={k}
              accessibilityRole="radio"
              accessibilityState={{ selected: kind === k }}
              onPress={() => setKind(k)}
              style={[styles.kind, kind === k && styles.kindOn]}
            >
              <Text style={[styles.kindText, kind === k && styles.kindTextOn]}>
                {tr(`report.kind.${k}`)}
              </Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          value={comment}
          onChangeText={setComment}
          placeholder={tr('report.comment')}
          placeholderTextColor="#566658"
          maxLength={MAX_REPORT_COMMENT}
          multiline
          style={styles.input}
        />
        {state === 'failed' ? <Text style={styles.error}>{tr('report.failed')}</Text> : null}
        <Pressable
          style={[styles.cta, !kind && styles.ctaOff]}
          accessibilityRole="button"
          accessibilityState={{ disabled: !kind }}
          onPress={() => void send()}
        >
          {state === 'sending' ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.ctaText}>{tr('report.send')}</Text>
          )}
        </Pressable>
        <Pressable style={styles.later} accessibilityRole="button" onPress={onClose}>
          <Text style={styles.laterText}>{tr('report.cancel')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(20,32,22,0.55)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#f4f8f2', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 24, paddingBottom: 40 },
  title: { fontSize: 20, fontWeight: '800', color: '#2f5d34' },
  body: { fontSize: 15, lineHeight: 22, color: '#4a5c4d' },
  kinds: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  kind: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 16, backgroundColor: '#e2ebe0' },
  kindOn: { backgroundColor: '#3a7d44' },
  kindText: { fontSize: 14, color: '#22331f', fontWeight: '600' },
  kindTextOn: { color: '#fff' },
  input: { marginTop: 14, minHeight: 80, borderRadius: 12, backgroundColor: '#fff', padding: 12, fontSize: 15, color: '#22331f', textAlignVertical: 'top' },
  error: { marginTop: 10, fontSize: 14, color: '#b3261e' },
  cta: { marginTop: 16, paddingVertical: 16, borderRadius: 14, backgroundColor: '#3a7d44', alignItems: 'center' },
  ctaOff: { backgroundColor: '#bcd0bd' },
  ctaText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  later: { marginTop: 8, paddingVertical: 12, alignItems: 'center' },
  laterText: { fontSize: 15, color: '#4a5c4d', fontWeight: '600' },
});
