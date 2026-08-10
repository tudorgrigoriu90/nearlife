import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { CONSENT_KINDS, type ConsentKind, type ConsentState } from '../lib/consent';
import { DEFAULT_DUAL_LANGUAGE, type DualLanguageSettings } from '../lib/dualLanguage';
import { ALPHA_LOCALES, createTranslator, type Locale, type TranslationKey } from '../lib/i18n';
import {
  dualDisplayLocales,
  endonymOf,
  needsMachineTranslationNotice,
  type ContentLocale,
} from '../lib/i18n/contentLocale';

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
  analyticsLocked = false,
  dualLanguage = DEFAULT_DUAL_LANGUAGE,
  onToggleConsent,
  onSelectLocale,
  onToggleDualLanguage,
  onSelectSecondaryLocale,
  onExportData,
  onDone,
}: {
  locale?: Locale;
  consent: ConsentState;
  /** Under-13 (age-gate, T-089): the analytics opt-in is withheld — minimal-data path. */
  analyticsLocked?: boolean;
  /** Mother-tongue dual display (F13.3) — off by default. */
  dualLanguage?: DualLanguageSettings;
  onToggleConsent: (kind: ConsentKind, value: boolean) => void;
  onSelectLocale: (locale: Locale) => void;
  onToggleDualLanguage?: (enabled: boolean) => void;
  onSelectSecondaryLocale?: (locale: ContentLocale) => void;
  onExportData: () => void;
  onDone: () => void;
}) {
  const tr = createTranslator(locale);
  // Minors are never offered analytics (T-089) — the toggle is removed, not just defaulted off.
  const consentKinds = analyticsLocked ? CONSENT_KINDS.filter((k) => k !== 'analytics') : CONSENT_KINDS;
  // Second-language options: everything with content, minus the language the app is already in
  // (pairing a language with itself renders every line twice — rejected in setSecondaryLocale).
  const secondaryOptions = dualDisplayLocales().filter((loc) => loc !== locale);
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
          {consentKinds.map((kind, i) => (
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
        {analyticsLocked ? <Text style={styles.hint}>{tr('consent.analyticsLocked')}</Text> : null}

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

        <Text style={styles.sectionLabel}>{tr('dual.title')}</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>{tr('dual.toggle')}</Text>
            <Switch
              value={dualLanguage.enabled}
              onValueChange={(v) => onToggleDualLanguage?.(v)}
              trackColor={{ true: '#3a7d44', false: '#cdd8ca' }}
            />
          </View>
        </View>

        {dualLanguage.enabled ? (
          <>
            <Text style={styles.subLabel}>{tr('dual.choose')}</Text>
            <View style={styles.card}>
              {secondaryOptions.map((loc, i) => (
                <Pressable
                  key={loc}
                  testID={`dual-locale-${loc}`}
                  onPress={() => onSelectSecondaryLocale?.(loc)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: dualLanguage.secondaryLocale === loc }}
                  style={[styles.row, i > 0 && styles.rowBorder]}
                >
                  {/* Own-script name: someone looking for their language scans for its native
                      name, not its English exonym. */}
                  <Text style={styles.rowLabel}>{endonymOf(loc)}</Text>
                  <View style={styles.rowEnd}>
                    {needsMachineTranslationNotice(loc) ? (
                      <Text style={styles.mtTag}>{tr('dual.machineTranslated')}</Text>
                    ) : null}
                    {dualLanguage.secondaryLocale === loc ? (
                      <Text style={styles.check}>✓</Text>
                    ) : null}
                  </View>
                </Pressable>
              ))}
            </View>
            <Text style={styles.hint}>{tr('dual.chooseHint', { primary: tr(LOCALE_KEY[locale] ?? 'lang.en') })}</Text>
            <Text style={styles.hint}>{tr('dual.machineTranslatedHint')}</Text>
          </>
        ) : (
          // Discoverability while OFF (F13.3): one quiet box telling the user the option exists.
          // No modal, no badge, no repeat nagging — the feature is offered, never pushed.
          <View style={styles.infoBox}>
            <Text style={styles.infoGlyph}>🌍</Text>
            <Text style={styles.infoText}>{tr('dual.hint')}</Text>
          </View>
        )}

        <Text style={styles.sectionLabel}>{tr('settings.yourData')}</Text>
        <View style={styles.card}>
          <Pressable onPress={onExportData} accessibilityRole="button" style={styles.row}>
            <Text style={styles.rowLabel}>{tr('settings.exportData')}</Text>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
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
  chevron: { fontSize: 20, color: '#9fb0a0' },
  hint: { marginTop: 8, fontSize: 12, color: '#7a8a7c', fontStyle: 'italic' },
  subLabel: { marginTop: 14, marginBottom: 8, fontSize: 12, fontWeight: '600', color: '#4a5c4d' },
  rowEnd: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mtTag: { fontSize: 10, color: '#7a8a7c', textTransform: 'uppercase', letterSpacing: 0.5 },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 10,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#eef4ec',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#d4e0d2',
  },
  infoGlyph: { fontSize: 16, lineHeight: 20 },
  infoText: { flex: 1, fontSize: 13, lineHeight: 19, color: '#4a5c4d' },
  attribution: { paddingVertical: 14, fontSize: 13, color: '#4a5c4d', lineHeight: 19 },
  about: { marginTop: 28, fontSize: 12, color: '#9fb0a0', textAlign: 'center' },
});
