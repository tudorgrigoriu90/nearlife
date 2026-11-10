import { Pressable, StyleSheet, Text, View } from 'react-native';
import { createTranslator, type Locale } from '../lib/i18n';

// T-252: shown instead of the app when the server cannot be reached, because offline the lists
// load but every card is empty. "Continue offline" stays: catch spots are cached for use outdoors
// (T-068), where there is often no signal.

export default function OfflineScreen({
  locale,
  checking,
  onRetry,
  onContinue,
}: {
  locale: Locale;
  checking: boolean;
  onRetry: () => void;
  onContinue: () => void;
}) {
  const tr = createTranslator(locale);
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>📡</Text>
      <Text style={styles.title} accessibilityRole="header">
        {tr('offline.title')}
      </Text>
      <Text style={styles.body}>{tr('offline.body')}</Text>
      <Pressable
        style={[styles.cta, checking && styles.ctaBusy]}
        onPress={onRetry}
        disabled={checking}
        accessibilityRole="button"
        accessibilityState={{ busy: checking, disabled: checking }}
      >
        <Text style={styles.ctaText}>
          {checking ? tr('offline.checking') : tr('offline.retry')}
        </Text>
      </Pressable>
      <Pressable style={styles.secondary} onPress={onContinue} accessibilityRole="button">
        <Text style={styles.secondaryText}>{tr('offline.continue')}</Text>
      </Pressable>
      <Text style={styles.note}>{tr('offline.continueNote')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f8f2',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  icon: { fontSize: 48, textAlign: 'center' },
  title: { marginTop: 12, fontSize: 24, fontWeight: '700', color: '#2f5d34', textAlign: 'center' },
  body: { marginTop: 12, fontSize: 16, lineHeight: 23, color: '#4a5c4d', textAlign: 'center' },
  cta: {
    marginTop: 28,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: '#3a7d44',
    alignItems: 'center',
  },
  ctaBusy: { backgroundColor: '#7fa886' },
  ctaText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  secondary: { marginTop: 12, paddingVertical: 14, alignItems: 'center' },
  secondaryText: { fontSize: 16, fontWeight: '600', color: '#3a7d44' },
  note: { fontSize: 13, lineHeight: 19, color: '#6b7d6e', textAlign: 'center' },
});
