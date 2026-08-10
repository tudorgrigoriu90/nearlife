import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { createTranslator, type Locale } from '../lib/i18n';

// Deletion confirmation (T-093 · GDPR right to erasure). Deletion is irreversible, so it takes an
// explicit confirm on a dedicated screen (not a one-tap toggle). `onConfirm` returns whether the
// erase succeeded; on failure we surface a retryable error and keep the user here (the account was
// NOT deleted). On success the parent unmounts this screen. No upsell, no dark patterns — Cancel is
// given equal weight (invariant #4/#6).

export default function DeleteAccountConfirm({
  locale = 'en',
  onConfirm,
  onCancel,
}: {
  locale?: Locale;
  onConfirm: () => Promise<boolean>;
  onCancel: () => void;
}) {
  const tr = createTranslator(locale);
  const [status, setStatus] = useState<'idle' | 'deleting' | 'error'>('idle');
  const deleting = status === 'deleting';

  const confirm = async () => {
    setStatus('deleting');
    const ok = await onConfirm();
    // On success the parent navigates away; only reflect a failure here.
    if (!ok) setStatus('error');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>⚠️</Text>
      <Text style={styles.title}>{tr('delete.title')}</Text>
      <Text style={styles.body}>{tr('delete.body')}</Text>

      {status === 'error' ? <Text style={styles.error}>{tr('delete.error')}</Text> : null}

      <Pressable
        style={[styles.deleteBtn, deleting && styles.btnDisabled]}
        disabled={deleting}
        onPress={confirm}
        accessibilityRole="button"
        accessibilityState={{ disabled: deleting }}
      >
        {deleting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.deleteText}>{tr('delete.confirm')}</Text>
        )}
      </Pressable>

      <Pressable
        style={styles.cancelBtn}
        disabled={deleting}
        onPress={onCancel}
        accessibilityRole="button"
      >
        <Text style={styles.cancelText}>{tr('delete.cancel')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f8f2', paddingHorizontal: 28, justifyContent: 'center' },
  emoji: { fontSize: 52, textAlign: 'center' },
  title: { marginTop: 16, fontSize: 24, fontWeight: '700', color: '#22331f', textAlign: 'center' },
  body: { marginTop: 12, fontSize: 15, lineHeight: 22, color: '#4a5c4d', textAlign: 'center' },
  error: { marginTop: 16, fontSize: 14, color: '#b3261e', textAlign: 'center', fontWeight: '600' },
  deleteBtn: {
    marginTop: 28,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: '#b3261e',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  btnDisabled: { opacity: 0.7 },
  deleteText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  cancelBtn: { marginTop: 12, paddingVertical: 14, alignItems: 'center' },
  cancelText: { fontSize: 16, fontWeight: '600', color: '#3a7d44' },
});
