import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { CONSENT_KINDS, type ConsentKind, type ConsentState } from '../lib/consent';
import { ALPHA_LOCALES, createTranslator, type Locale, type TranslationKey } from '../lib/i18n';

// Settings (T-088 consent UI · T-101 attribution · T-123 locale override · invariant #6). The home
// for privacy controls — granular consent toggles that default off (no pre-ticked boxes, no ad
// consent), a language override, and the required data attribution. Consent/locale state is owned
// by the app; this screen is presentational. Data export + account deletion rows land with
// T-092/T-093. NOTE: on-device layout not visually verified.

const CONSENT_KEY: Record<ConsentKind, TranslationKey> = {
  location: 'consent.location',
  notifications: 'consent.notifications',
  analytics: 'consent.analytics',
};

const LOCALE_KEY: Record<string, TranslationKey> = { en: 'lang.en', sv: 'lang.sv' };

export default function SettingsScreen({
  locale = 'en',
  consent,
  onToggleConsent,
  onSelectLocale,
  onDone,
}: {
  locale?: Locale;
  consent: ConsentState;
  onToggleConsent: (kind: ConsentKind, value: boolean) => void;
  onSelectLocale: (locale: Locale) => void;
  onDone: () => void;
}) {
  const tr = createTranslator(locale);
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{tr('settings.title')}</Text>
        <Pressable onPress={onDone} accessibilityRole="button">
          <Text style={styles.done}>{tr('settings.done')}</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionLabel}>{tr('settings.privacy')}</Text>
        <View style={styles.card}>
          {CONSENT_KINDS.map((kind, i) => (
            <View key={kind} style={[styles.row, i > 0 && styles.rowBorder]}>
              <Text style={styles.rowLabel}>{tr(CONSENT_KEY[kind])}</Text>
              <Switch
                value={consent[kind]}
                onValueChange={(v) => onToggleConsent(kind, v)}
                trackColor={{ true: '#3a7d44', false: '#cdd8ca' }}
              />
            </View>
          ))}
        </View>
        <Text style={styles.hint}>{tr('consent.hint')}</Text>

        <Text style={styles.sectionLabel}>{tr('settings.language')}</Text>
        <View style={styles.card}>
          {ALPHA_LOCALES.map((loc, i) => (
            <Pressable
              key={loc}
              onPress={() => onSelectLocale(loc)}
              accessibilityRole="button"
              accessibilityState={{ selected: locale === loc }}
              style={[styles.row, i > 0 && styles.rowBorder]}
            >
              <Text style={styles.rowLabel}>{tr(LOCALE_KEY[loc] ?? 'lang.en')}</Text>
              {locale === loc ? <Text style={styles.check}>✓</Text> : null}
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionLabel}>{tr('settings.dataAttribution')}</Text>
        <View style={styles.card}>
          <Text style={styles.attribution}>{tr('attribution.gbif')}</Text>
          <Text style={[styles.attribution, styles.rowBorder]}>{tr('attribution.osm')}</Text>
        </View>

        <Text style={styles.about}>{tr('settings.about')}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f8f2', paddingTop: 56 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 8 },
  title: { fontSize: 26, fontWeight: '700', color: '#2f5d34' },
  done: { fontSize: 16, fontWeight: '600', color: '#3a7d44' },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  sectionLabel: { marginTop: 20, marginBottom: 8, fontSize: 12, fontWeight: '700', letterSpacing: 1, color: '#4a5c4d', textTransform: 'uppercase' },
  card: { backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 16 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 },
  rowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#e2ebe0' },
  rowLabel: { fontSize: 16, color: '#22331f' },
  check: { fontSize: 16, fontWeight: '700', color: '#3a7d44' },
  hint: { marginTop: 8, fontSize: 12, color: '#7a8a7c', fontStyle: 'italic' },
  attribution: { paddingVertical: 14, fontSize: 13, color: '#4a5c4d', lineHeight: 19 },
  about: { marginTop: 28, fontSize: 12, color: '#9fb0a0', textAlign: 'center' },
});
