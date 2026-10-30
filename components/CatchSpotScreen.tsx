import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import type { CatchSpotView } from '../lib/catchSpots';
import { createTranslator, type Locale, type TranslationKey } from '../lib/i18n';

// The catch spot (T-068 · USER-FLOWS §6 · GDD §4). Catching means going to the species' habitat:
// the nearest designated public place that suits it (a pike is sent to water). Within range the
// catch unlocks; otherwise the screen shows where to go and how far, and hands the walk to the
// phone's maps app.
//
// Privacy: the distance is computed on the device. "Directions" passes only the DESTINATION to the
// maps app, never the user's position. Map data © OpenStreetMap contributors (T-008).

const KIND_KEY: Record<string, TranslationKey> = {
  viewpoint: 'spot.viewpoint',
  picnic_site: 'spot.picnicSite',
  shelter: 'spot.shelter',
  park: 'spot.park',
  trailhead: 'spot.trailhead',
  bird_hide: 'spot.birdHide',
  beach: 'spot.beach',
  bathing_place: 'spot.bathingPlace',
  fishing: 'spot.fishing',
};

/** 40 → "40 m", 1250 → "1.3 km". */
export function formatDistance(m: number): string {
  return m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1)} km`;
}

export function directionsUrl(lat: number, lon: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}&travelmode=walking`;
}

export default function CatchSpotScreen({
  locale = 'en',
  speciesName,
  view,
  onCatch,
  onCheckAgain,
  onBack,
}: {
  locale?: Locale;
  speciesName: string;
  /** null while the position and spots are loading. */
  view: CatchSpotView | null;
  onCatch: () => void;
  onCheckAgain: () => void;
  onBack?: () => void;
}) {
  const tr = createTranslator(locale);
  const spot = view?.spot ?? null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{tr('catchSpot.title', { species: speciesName })}</Text>
        {onBack ? (
          <Pressable onPress={onBack} accessibilityRole="button">
            <Text style={styles.done}>{tr('settings.done')}</Text>
          </Pressable>
        ) : null}
      </View>

      {view === null ? (
        <View style={styles.card}>
          <ActivityIndicator color="#3a7d44" />
          <Text style={styles.body}>{tr('catchSpot.finding')}</Text>
        </View>
      ) : view.state === 'unmapped' ? (
        <View style={styles.card}>
          <Text style={styles.body}>{tr('catchSpot.unmapped')}</Text>
          <Pressable onPress={onCatch} accessibilityRole="button" style={styles.catch}>
            <Text style={styles.catchText}>{tr('catchSpot.catch')}</Text>
          </Pressable>
        </View>
      ) : view.state === 'no-spots' ? (
        <View style={styles.card}>
          <Text style={styles.body}>{tr('catchSpot.noSpots', { species: speciesName })}</Text>
        </View>
      ) : (
        <View style={styles.card}>
          {spot ? (
            <>
              <Text style={styles.spotName}>{spot.name ?? tr(KIND_KEY[spot.kind] ?? 'spot.place')}</Text>
              {spot.name ? <Text style={styles.kind}>{tr(KIND_KEY[spot.kind] ?? 'spot.place')}</Text> : null}
            </>
          ) : null}
          {view.state === 'gps-off' ? <Text style={styles.body}>{tr('catchSpot.gpsOff')}</Text> : null}
          {view.distanceM !== null && view.state === 'too-far' ? (
            <Text style={styles.distance}>{tr('catchSpot.distance', { distance: formatDistance(view.distanceM) })}</Text>
          ) : null}
          {view.state === 'in-range' ? (
            <>
              <Text style={styles.here}>{tr('catchSpot.here')}</Text>
              <Pressable onPress={onCatch} accessibilityRole="button" style={styles.catch}>
                <Text style={styles.catchText}>{tr('catchSpot.catch')}</Text>
              </Pressable>
            </>
          ) : (
            <>
              {spot ? (
                <Pressable
                  onPress={() => void Linking.openURL(directionsUrl(spot.lat, spot.lon)).catch(() => undefined)}
                  accessibilityRole="button"
                  style={styles.primary}
                >
                  <Text style={styles.primaryText}>{tr('catchSpot.directions')}</Text>
                </Pressable>
              ) : null}
              <Pressable onPress={onCheckAgain} accessibilityRole="button" style={styles.secondary}>
                <Text style={styles.secondaryText}>{tr('catchSpot.checkAgain')}</Text>
              </Pressable>
            </>
          )}
          <Text style={styles.safety}>{tr('catchSpot.safety')}</Text>
        </View>
      )}

      <Text style={styles.osm}>{tr('catchSpot.osm')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f8f2', paddingTop: 56, paddingHorizontal: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, marginBottom: 16 },
  title: { flex: 1, fontSize: 24, fontWeight: '700', color: '#2f5d34' },
  done: { fontSize: 16, fontWeight: '600', color: '#3a7d44' },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 18, gap: 10 },
  spotName: { fontSize: 20, fontWeight: '700', color: '#22331f' },
  kind: { fontSize: 14, color: '#4a5c4d' },
  body: { fontSize: 15, lineHeight: 22, color: '#4a5c4d' },
  distance: { fontSize: 17, fontWeight: '600', color: '#3a7d44' },
  here: { fontSize: 16, fontWeight: '700', color: '#2f7d4f' },
  catch: { backgroundColor: '#3a7d44', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  catchText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  primary: { backgroundColor: '#3a7d44', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  primaryText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  secondary: { backgroundColor: '#eaf4ea', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  secondaryText: { color: '#2f7d4f', fontSize: 15, fontWeight: '600' },
  safety: { fontSize: 12, lineHeight: 18, color: '#7a8a7c' },
  osm: { marginTop: 12, fontSize: 11, color: '#9fb0a0', textAlign: 'center' },
});
