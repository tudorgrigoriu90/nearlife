import type { ReactNode } from 'react';
import NotifChoices from './NotifChoices';
import type { NotifPrefs } from '../lib/notifPrefs';
import appJson from '../app.json';
import { Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { CONSENT_KINDS, type ConsentKind, type ConsentState } from '../lib/consent';
import { DEFAULT_DUAL_LANGUAGE, type DualLanguageSettings } from '../lib/dualLanguage';
import { PRIVACY_POLICY_URL } from '../lib/legal';
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
// T-092/T-093. NOTE: layout awaits the device check (T-141).

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
  easyCatching = false,
  onToggleEasyCatching,
  notifPrefs = null,
  onChangeNotifPrefs,
  onSelectSecondaryLocale,
  onExportData,
  onLinkEmail,
  onSignIn,
  onSetHomeCounty,
  onOpenAccessCode,
  onOpenFamily,
  onOpenStore,
  onOpenCounties,
  onDeleteAccount,
  offlineSection,
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
  /** Easy catching (T-331 · review I-25). */
  easyCatching?: boolean;
  /** Notification choices (T-342 · review F-03); null until read from the profile. */
  notifPrefs?: NotifPrefs | null;
  onChangeNotifPrefs?: (next: NotifPrefs) => void;
  onToggleEasyCatching?: (on: boolean) => void;
  onSelectSecondaryLocale?: (locale: ContentLocale) => void;
  onExportData: () => void;
  /** Open the link-email flow (T-133 · make the account durable across reinstall/devices). */
  onLinkEmail?: () => void;
  /** Sign in to an account with a linked email (T-271). */
  onSignIn?: () => void;
  /** Set the home county, offered while there is none (T-272 · review B-09). */
  onSetHomeCounty?: () => void;
  /** Reviewer access codes (T-237); omitted without a backend, since the server checks the code. */
  onOpenAccessCode?: () => void;
  /** Open the Family screen (T-103): join with a code, or manage your family. */
  onOpenFamily?: () => void;
  /** Open the Store (T-085): buy or restore the Full Game / Family. */
  onOpenStore?: () => void;
  /** Open the Counties screen (T-105). */
  onOpenCounties?: () => void;
  /** Open the account/data deletion flow (T-093 · GDPR erasure, reachable from Settings). */
  onDeleteAccount?: () => void;
  /** Settings → Offline (T-256), built by the caller, which owns the pack. */
  offlineSection?: ReactNode;
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
        {consent.notifications && notifPrefs && onChangeNotifPrefs ? (
          <NotifChoices locale={locale} prefs={notifPrefs} onChange={onChangeNotifPrefs} />
        ) : null}

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

        {onToggleEasyCatching ? (
          <>
            <Text style={styles.sectionLabel}>{tr('easy.title')}</Text>
            <View style={styles.card}>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>{tr('easy.toggle')}</Text>
                <Switch
                  testID="easy-catching"
                  accessibilityLabel={tr('easy.toggle')}
                  value={easyCatching}
                  onValueChange={onToggleEasyCatching}
                  trackColor={{ true: '#3a7d44', false: '#cdd8ca' }}
                />
              </View>
            </View>
            <Text style={styles.subLabel}>{tr('easy.note')}</Text>
          </>
        ) : null}

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

        {onOpenFamily ? (
          <>
            <Text style={styles.sectionLabel}>{tr('family.title')}</Text>
            <View style={styles.card}>
              {onOpenStore ? (
                <Pressable onPress={onOpenStore} accessibilityRole="button" style={styles.row}>
                  <Text style={styles.rowLabel}>{tr('settings.store')}</Text>
                  <Text style={styles.chevron}>›</Text>
                </Pressable>
              ) : null}
              <Pressable
                onPress={onOpenFamily}
                accessibilityRole="button"
                style={[styles.row, onOpenStore ? styles.rowBorder : null]}
              >
                <Text style={styles.rowLabel}>{tr('settings.family')}</Text>
                <Text style={styles.chevron}>›</Text>
              </Pressable>
              {onOpenCounties ? (
                <Pressable onPress={onOpenCounties} accessibilityRole="button" style={[styles.row, styles.rowBorder]}>
                  <Text style={styles.rowLabel}>{tr('settings.counties')}</Text>
                  <Text style={styles.chevron}>›</Text>
                </Pressable>
              ) : null}
            </View>
          </>
        ) : null}

        {offlineSection ? (
          <>
            <Text style={styles.sectionLabel}>{tr('offline.section')}</Text>
            {offlineSection}
          </>
        ) : null}

        <Text style={styles.sectionLabel}>{tr('settings.yourData')}</Text>
        <View style={styles.card}>
          <Pressable onPress={onExportData} accessibilityRole="button" style={styles.row}>
            <Text style={styles.rowLabel}>{tr('settings.exportData')}</Text>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
          {/* The published policy, reachable from inside the app (T-228, GDPR transparency). A
              failed open (no browser) is ignored rather than crashing Settings. */}
          <Pressable
            onPress={() => void Linking.openURL(PRIVACY_POLICY_URL).catch(() => undefined)}
            accessibilityRole="link"
            style={[styles.row, styles.rowBorder]}
          >
            <Text style={styles.rowLabel}>{tr('settings.privacyPolicy')}</Text>
            <Text style={styles.chevron}>↗</Text>
          </Pressable>
          {onLinkEmail ? (
            <Pressable
              onPress={onLinkEmail}
              accessibilityRole="button"
              style={[styles.row, styles.rowBorder]}
            >
              <Text style={styles.rowLabel}>{tr('settings.linkEmail')}</Text>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          ) : null}
          {onSetHomeCounty ? (
            <Pressable
              onPress={onSetHomeCounty}
              accessibilityRole="button"
              style={[styles.row, styles.rowBorder]}
            >
              <Text style={styles.rowLabel}>{tr('preview.setHome')}</Text>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          ) : null}
          {onSignIn ? (
            <Pressable
              onPress={onSignIn}
              accessibilityRole="button"
              style={[styles.row, styles.rowBorder]}
            >
              <Text style={styles.rowLabel}>{tr('signin.entry')}</Text>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          ) : null}
          {onOpenAccessCode ? (
            <Pressable
              onPress={onOpenAccessCode}
              accessibilityRole="button"
              style={[styles.row, styles.rowBorder]}
            >
              <Text style={styles.rowLabel}>{tr('settings.accessCode')}</Text>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          ) : null}
          {onDeleteAccount ? (
            <Pressable
              onPress={onDeleteAccount}
              accessibilityRole="button"
              style={[styles.row, styles.rowBorder]}
            >
              <Text style={[styles.rowLabel, styles.danger]}>{tr('settings.deleteAccount')}</Text>
              <Text style={[styles.chevron, styles.danger]}>›</Text>
            </Pressable>
          ) : null}
        </View>

        <Text style={styles.sectionLabel}>{tr('settings.dataAttribution')}</Text>
        <View style={styles.card}>
          <Text style={styles.attribution}>{tr('attribution.gbif')}</Text>
          <Text style={[styles.attribution, styles.rowBorder]}>{tr('attribution.osm')}</Text>
          <Text style={[styles.attribution, styles.rowBorder]}>{tr('attribution.wikipedia')}</Text>
          <Text style={[styles.attribution, styles.rowBorder]}>{tr('attribution.wikidata')}</Text>
          <Text style={[styles.attribution, styles.rowBorder]}>{tr('attribution.redlistSe')}</Text>
          <Text style={[styles.attribution, styles.rowBorder]}>{tr('attribution.photos')}</Text>
          <Text style={[styles.attribution, styles.rowBorder]}>{tr('attribution.naturalEarth')}</Text>
        </View>

        <Text style={styles.about}>{tr('settings.about', { version: appJson.expo.version })}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f8f2', paddingTop: 56 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 8 },
  title: { fontSize: 26, fontWeight: '700', color: '#2f5d34' },
  done: { fontSize: 16, fontWeight: '600', color: '#336f3c' },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  sectionLabel: { marginTop: 20, marginBottom: 8, fontSize: 12, fontWeight: '700', letterSpacing: 1, color: '#4a5c4d', textTransform: 'uppercase' },
  card: { backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 16 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 },
  rowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#e2ebe0' },
  rowLabel: { fontSize: 16, color: '#22331f' },
  check: { fontSize: 16, fontWeight: '700', color: '#336f3c' },
  chevron: { fontSize: 20, color: '#566658' },
  hint: { marginTop: 8, fontSize: 12, color: '#566658', fontStyle: 'italic' },
  subLabel: { marginTop: 14, marginBottom: 8, fontSize: 12, fontWeight: '600', color: '#4a5c4d' },
  rowEnd: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mtTag: { fontSize: 10, color: '#566658', textTransform: 'uppercase', letterSpacing: 0.5 },
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
  danger: { color: '#b3261e' },
  about: { marginTop: 28, fontSize: 12, color: '#566658', textAlign: 'center' },
});
