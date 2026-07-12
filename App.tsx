import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AlmanacScreen from './components/AlmanacScreen';
import OnboardingFlow from './components/OnboardingFlow';
import SpeciesCard from './components/SpeciesCard';
import ThisWeekScreen from './components/ThisWeekScreen';
import TimingRingMinigame from './components/minigame/TimingRingMinigame';
import ProtectTip from './components/catch/ProtectTip';
import FreeCatchSheet from './components/catch/FreeCatchSheet';
import PledgeConfirm from './components/helped/PledgeConfirm';
import SettingsScreen from './components/SettingsScreen';
import DataExportView from './components/DataExportView';
import { useCollection } from './components/useCollection';
import { useTracker } from './components/useTracker';
import { DEFAULT_CONSENT, setConsent, type ConsentKind, type ConsentState } from './lib/consent';
import { buildDataExport, exportToJson } from './lib/dataExport';
import { KRONOBERG_REGION } from './lib/hometown';
import { spottedIds, tierStateFor } from './lib/collection';
import {
  canCatch,
  registerCatch,
  remainingFreeCatches,
  type FreeCatchState,
} from './lib/freeCatch';
import { isPrimeCatch } from './lib/primeBonus';
import { seasonKeyOf } from './lib/season';
import { detectDeviceLocale } from './lib/i18n/deviceLocale';
import { createTranslator, type Locale } from './lib/i18n';
import { KRONOBERG_SPECIES } from './lib/species/kronoberg';
import type { HelpKind } from './lib/collection';
import type { Species } from './lib/species/types';

const INITIAL_FREE_CATCH: FreeCatchState = {
  fullGame: false,
  freeCatchesUsed: 0,
  freeCatchSeason: null,
};

// Prototype app shell (E2). Onboarding (T-022+) runs first; once complete, a minimal tab
// switcher between the "This week" pull surface (T-117) and the Almanac grid (T-025); tapping a
// species opens its card (T-026). No navigation library yet — local state is enough for the
// throwaway prototype. Collection is empty until persistence lands (T-027, Supabase-gated);
// tap-to-collect is T-029.

type Tab = 'thisWeek' | 'almanac';

export default function App() {
  // Device locale by default; a user override from Settings takes precedence (T-123).
  const [localeOverride, setLocaleOverride] = useState<Locale | null>(null);
  const locale = localeOverride ?? detectDeviceLocale();
  const tr = createTranslator(locale);
  const collection = useCollection();
  const [onboarded, setOnboarded] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [tab, setTab] = useState<Tab>('thisWeek');
  const [showSettings, setShowSettings] = useState(false);
  const [exportJson, setExportJson] = useState<string | null>(null);
  const [consent, setConsentState] = useState<ConsentState>(DEFAULT_CONSENT);
  const track = useTracker(consent);
  const [selected, setSelected] = useState<Species | null>(null);
  const [catching, setCatching] = useState<Species | null>(null);
  const [caughtTip, setCaughtTip] = useState<Species | null>(null);
  const [pledge, setPledge] = useState<{ species: Species; kind: HelpKind } | null>(null);
  const [paywall, setPaywall] = useState(false);
  const [freeCatch, setFreeCatch] = useState<FreeCatchState>(INITIAL_FREE_CATCH);

  const toggleConsent = (kind: ConsentKind, value: boolean) =>
    setConsentState((c) => setConsent(c, kind, value));

  // Validation-funnel instrumentation (T-035): session start, and This Week opened whenever the
  // user is on that tab (covers both the initial view and switching back to it). `track` is
  // stable across renders (useTracker), so this fires once per mount despite the dependency.
  useEffect(() => {
    track('session_start', {});
  }, [track]);

  useEffect(() => {
    if (onboarded && tab === 'thisWeek' && !showSettings && exportJson === null) {
      track('this_week_opened', {});
    }
  }, [onboarded, tab, showSettings, exportJson, track]);

  const exportMyData = () => {
    const bundle = buildDataExport({
      exportedAt: new Date().toISOString(),
      profile: { homeRegion: previewMode ? null : KRONOBERG_REGION.id },
      consent,
      collection: collection.records,
    });
    setExportJson(exportToJson(bundle));
  };

  const seasonKey = seasonKeyOf(new Date());
  const remaining = remainingFreeCatches(freeCatch, seasonKey);

  // Catch entry (T-034): a free user gets 3 catches/season; the 4th attempt shows the gentle
  // sheet instead of the minigame. The counter increments only on a successful catch.
  const attemptCatch = (species: Species) => {
    if (canCatch(freeCatch, seasonKey)) {
      track('catch_attempted', { speciesId: species.id });
      setCatching(species);
    } else {
      track('free_catches_exhausted', {});
      setPaywall(true);
    }
  };

  if (!onboarded) {
    return (
      <OnboardingFlow
        locale={locale}
        onFirstSpotted={(speciesId) => {
          collection.spot(speciesId);
          track('species_spotted', { speciesId, source: 'onboarding' });
        }}
        onComplete={({ locationOutcome }) => {
          setPreviewMode(locationOutcome === 'denied');
          setOnboarded(true);
        }}
      />
    );
  }

  if (exportJson !== null) {
    return (
      <>
        <DataExportView json={exportJson} locale={locale} onDone={() => setExportJson(null)} />
        <StatusBar style="auto" />
      </>
    );
  }

  if (showSettings) {
    return (
      <>
        <SettingsScreen
          locale={locale}
          consent={consent}
          onToggleConsent={toggleConsent}
          onSelectLocale={(loc) => setLocaleOverride(loc)}
          onExportData={exportMyData}
          onDone={() => setShowSettings(false)}
        />
        <StatusBar style="auto" />
      </>
    );
  }

  if (caughtTip) {
    // Catch-success delight moment: contextual protect tip, kept clean — no upsell (invariant #4).
    return (
      <>
        <ProtectTip species={caughtTip} locale={locale} onDone={() => setCaughtTip(null)} />
        <StatusBar style="auto" />
      </>
    );
  }

  if (pledge) {
    // Helped-tier confirmation — clean, no upsell (invariant #4).
    return (
      <>
        <PledgeConfirm
          species={pledge.species}
          kind={pledge.kind}
          locale={locale}
          onDone={() => setPledge(null)}
        />
        <StatusBar style="auto" />
      </>
    );
  }

  if (catching) {
    const target = catching;
    return (
      <>
        <TimingRingMinigame
          locale={locale}
          onCancel={() => setCatching(null)}
          onComplete={({ success, result }) => {
            setCatching(null);
            if (success) {
              // Counter increments on success only; the attempt was already gated by canCatch.
              setFreeCatch((prev) => registerCatch(prev, seasonKey));
              // Prime bonus when caught within the species' active window (GDD §6, T-074).
              collection.markCaught(target.id, isPrimeCatch(target, new Date()));
              track('catch_succeeded', {
                speciesId: target.id,
                grade: result.grade === 'perfect' ? 'perfect' : 'good',
              });
              setCaughtTip(target);
            }
          }}
        />
        <StatusBar style="auto" />
      </>
    );
  }

  if (selected) {
    return (
      <View style={styles.root}>
        <SpeciesCard
          species={selected}
          locale={locale}
          tier={tierStateFor(collection.records, selected.id)}
          fullGame={freeCatch.fullGame}
          onBack={() => setSelected(null)}
          onFindNearby={attemptCatch}
          onPledge={(species, kind) => {
            // Helped tier: one-tap honor-system pledge (GDD §5) → mark Helped + confirm.
            collection.help(species.id, kind);
            setPledge({ species, kind });
          }}
          nearbyNote={freeCatch.fullGame ? undefined : tr('catch.remaining', { count: remaining })}
        />
        {paywall ? <FreeCatchSheet locale={locale} onClose={() => setPaywall(false)} /> : null}
        <StatusBar style="auto" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {previewMode ? (
        <View style={styles.previewBanner}>
          <Text style={styles.previewText}>{tr('preview.banner')}</Text>
        </View>
      ) : null}
      <View style={styles.screen}>
        {tab === 'thisWeek' ? (
          <ThisWeekScreen
            locale={locale}
            spottedIds={spottedIds(collection.records)}
            onSelectSpecies={(species) => {
              // Tapping a This Week entry marks it Spotted and opens its card (same as a
              // notification tap, USER-FLOWS §4).
              collection.spot(species.id);
              track('species_spotted', { speciesId: species.id, source: 'this_week' });
              setSelected(species);
            }}
          />
        ) : (
          <AlmanacScreen
            species={KRONOBERG_SPECIES}
            records={collection.records}
            locale={locale}
            onSelectSpecies={setSelected}
          />
        )}
      </View>
      <View style={styles.tabBar}>
        <TabButton label={tr('thisWeek.title')} active={tab === 'thisWeek'} onPress={() => setTab('thisWeek')} />
        <TabButton label={tr('almanac.title')} active={tab === 'almanac'} onPress={() => setTab('almanac')} />
        <TabButton label={`⚙ ${tr('nav.settings')}`} active={false} onPress={() => setShowSettings(true)} />
      </View>
      <StatusBar style="auto" />
    </View>
  );
}

function TabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.tab} accessibilityRole="button" accessibilityState={{ selected: active }}>
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f8f2' },
  screen: { flex: 1 },
  previewBanner: { backgroundColor: '#fbe9c6', paddingTop: 44, paddingBottom: 8, paddingHorizontal: 16 },
  previewText: { fontSize: 12, color: '#7a5a1f', textAlign: 'center' },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#d4e0d2',
    backgroundColor: '#fff',
    paddingBottom: 24,
    paddingTop: 8,
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  tabText: { fontSize: 14, color: '#7a8a7c', fontWeight: '600' },
  tabTextActive: { color: '#2f5d34' },
});
