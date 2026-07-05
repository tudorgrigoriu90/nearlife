import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AlmanacScreen from './components/AlmanacScreen';
import OnboardingFlow from './components/OnboardingFlow';
import SpeciesCard from './components/SpeciesCard';
import ThisWeekScreen from './components/ThisWeekScreen';
import TimingRingMinigame from './components/minigame/TimingRingMinigame';
import ProtectTip from './components/catch/ProtectTip';
import FreeCatchSheet from './components/catch/FreeCatchSheet';
import { useCollection } from './components/useCollection';
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
import { createTranslator } from './lib/i18n';
import { KRONOBERG_SPECIES } from './lib/species/kronoberg';
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
  // Device locale for now; a user override from Settings will take precedence (T-123).
  const locale = detectDeviceLocale();
  const tr = createTranslator(locale);
  const collection = useCollection();
  const [onboarded, setOnboarded] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [tab, setTab] = useState<Tab>('thisWeek');
  const [selected, setSelected] = useState<Species | null>(null);
  const [catching, setCatching] = useState<Species | null>(null);
  const [caughtTip, setCaughtTip] = useState<Species | null>(null);
  const [paywall, setPaywall] = useState(false);
  const [freeCatch, setFreeCatch] = useState<FreeCatchState>(INITIAL_FREE_CATCH);

  const seasonKey = seasonKeyOf(new Date());
  const remaining = remainingFreeCatches(freeCatch, seasonKey);

  // Catch entry (T-034): a free user gets 3 catches/season; the 4th attempt shows the gentle
  // sheet instead of the minigame. The counter increments only on a successful catch.
  const attemptCatch = (species: Species) => {
    if (canCatch(freeCatch, seasonKey)) setCatching(species);
    else setPaywall(true);
  };

  if (!onboarded) {
    return (
      <OnboardingFlow
        locale={locale}
        onFirstSpotted={collection.spot}
        onComplete={({ locationOutcome }) => {
          setPreviewMode(locationOutcome === 'denied');
          setOnboarded(true);
        }}
      />
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

  if (catching) {
    const target = catching;
    return (
      <>
        <TimingRingMinigame
          locale={locale}
          onCancel={() => setCatching(null)}
          onComplete={({ success }) => {
            setCatching(null);
            if (success) {
              // Counter increments on success only; the attempt was already gated by canCatch.
              setFreeCatch((prev) => registerCatch(prev, seasonKey));
              // Prime bonus when caught within the species' active window (GDD §6, T-074).
              collection.markCaught(target.id, isPrimeCatch(target, new Date()));
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
