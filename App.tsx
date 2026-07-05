import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AlmanacScreen from './components/AlmanacScreen';
import OnboardingFlow from './components/OnboardingFlow';
import SpeciesCard from './components/SpeciesCard';
import ThisWeekScreen from './components/ThisWeekScreen';
import TimingRingMinigame from './components/minigame/TimingRingMinigame';
import { useCollection } from './components/useCollection';
import { spottedIds, tierStateFor } from './lib/collection';
import { detectDeviceLocale } from './lib/i18n/deviceLocale';
import { createTranslator } from './lib/i18n';
import { KRONOBERG_SPECIES } from './lib/species/kronoberg';
import type { Species } from './lib/species/types';

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

  if (catching) {
    return (
      <>
        <TimingRingMinigame
          locale={locale}
          onCancel={() => setCatching(null)}
          onComplete={({ success }) => {
            // Prototype: success writes Caught (prime-bonus computation is T-074). The free-catch
            // gate, protect tip and paywall wrap this in T-034.
            if (success) collection.markCaught(catching.id, false);
            setCatching(null);
          }}
        />
        <StatusBar style="auto" />
      </>
    );
  }

  if (selected) {
    return (
      <>
        <SpeciesCard
          species={selected}
          locale={locale}
          tier={tierStateFor(collection.records, selected.id)}
          onBack={() => setSelected(null)}
          onFindNearby={(species) => setCatching(species)}
        />
        <StatusBar style="auto" />
      </>
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
