import { Pressable, StyleSheet, Text, View } from 'react-native';
import { createTranslator, type Locale } from '../../lib/i18n';

// The gentle out-of-free-catches sheet (T-034 · ECONOMY). Shown only when a free user attempts a
// 4th catch in a season — the single conversion nudge, never on a delight moment (invariant #4).
// No dark patterns: no countdowns or urgency, and it reassures that the mission is always free
// and there are no ads. The prototype has no real purchase (RevenueCat lands in E9); the CTA is
// a placeholder.

export default function FreeCatchSheet({
  locale = 'en',
  onClose,
}: {
  locale?: Locale;
  onClose: () => void;
}) {
  const tr = createTranslator(locale);
  return (
    <View style={styles.backdrop}>
      <View style={styles.sheet}>
        <Text style={styles.title}>{tr('paywall.title')}</Text>
        <Text style={styles.body}>{tr('paywall.body')}</Text>
        <Text style={styles.reassure}>{tr('paywall.freeMission')}</Text>
        <Text style={styles.reassure}>{tr('paywall.noAds')}</Text>
        <Pressable style={styles.cta} accessibilityRole="button" onPress={onClose}>
          <Text style={styles.ctaText}>{tr('paywall.cta')}</Text>
        </Pressable>
        <Text style={styles.soon}>{tr('paywall.soon')}</Text>
        <Pressable style={styles.later} accessibilityRole="button" onPress={onClose}>
          <Text style={styles.laterText}>{tr('paywall.later')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(20,32,22,0.55)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#f4f8f2', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 24, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '800', color: '#2f5d34' },
  body: { marginTop: 10, fontSize: 15, lineHeight: 22, color: '#4a5c4d' },
  reassure: { marginTop: 10, fontSize: 14, fontWeight: '600', color: '#2f7d4f' },
  cta: { marginTop: 20, paddingVertical: 16, borderRadius: 14, backgroundColor: '#3a7d44', alignItems: 'center' },
  ctaText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  soon: { marginTop: 10, fontSize: 12, color: '#7a8a7c', textAlign: 'center', fontStyle: 'italic' },
  later: { marginTop: 8, paddingVertical: 12, alignItems: 'center' },
  laterText: { fontSize: 15, color: '#4a5c4d', fontWeight: '600' },
});
