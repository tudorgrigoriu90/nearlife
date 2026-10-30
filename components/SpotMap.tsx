import { StyleSheet, View } from 'react-native';
import type { CatchSpot } from '../lib/catchSpots';
import type { LatLng } from '../lib/proximity';
import { MAP_STYLE_URL, nearbySpots, spotsGeoJson } from '../lib/spotMap';

// The catch-spot map (T-067 · USER-FLOWS §6): an OpenStreetMap street map (OpenFreeMap tiles, free
// and keyless) with the user's position, the nearby spots that suit the species as green dots, and
// the chosen one as a larger dot. Tapping a dot picks that spot.
//
// MapLibre is native code, present only in builds made after it was added. On an older build (or
// in Jest) the module is missing, so this renders nothing and the catch screen works without a map,
// exactly as before. Checked with TurboModuleRegistry.get, which returns null where getEnforcing
// would throw.
//
// Privacy: the blue dot is drawn by the phone's own location layer. The position is not sent
// anywhere; tile requests carry only the area being viewed.
//
// ⚠️ The native rendering is not covered by Jest; it needs a device check with the next build.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MapLibreModule = any;

let cached: MapLibreModule | null | undefined;

export function loadMapLibre(): MapLibreModule | null {
  if (cached !== undefined) return cached;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { TurboModuleRegistry } = require('react-native') as {
      TurboModuleRegistry: { get(name: string): unknown };
    };
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cached = TurboModuleRegistry.get('MLRNNetworkModule') ? require('@maplibre/maplibre-react-native') : null;
  } catch {
    cached = null;
  }
  return cached;
}

export default function SpotMap({
  user,
  spots,
  targetId,
  onPick,
}: {
  user: LatLng | null;
  spots: CatchSpot[];
  targetId: string | null;
  onPick: (spotId: string) => void;
}) {
  const ML = loadMapLibre();
  if (ML === null) return null;
  const shown = nearbySpots(user, spots);
  const target = spots.find((s) => s.id === targetId) ?? null;
  const center: [number, number] | null = target
    ? [target.lon, target.lat]
    : user
      ? [user.longitude, user.latitude]
      : null;

  return (
    <View style={styles.wrap}>
      <ML.Map style={styles.map} mapStyle={MAP_STYLE_URL} attribution logo={false} compass={false}>
        {center ? <ML.Camera initialViewState={{ center, zoom: 13 }} /> : null}
        <ML.NativeUserLocation />
        <ML.GeoJSONSource
          id="catch-spots"
          data={spotsGeoJson(shown, targetId)}
          onPress={(e: { nativeEvent: { features: { properties?: { id?: unknown } }[] } }) => {
            const id = e.nativeEvent.features[0]?.properties?.id;
            if (typeof id === 'string') onPick(id);
          }}
        >
          <ML.Layer
            id="catch-spots-dots"
            type="circle"
            paint={{
              'circle-radius': ['case', ['get', 'target'], 11, 7],
              'circle-color': ['case', ['get', 'target'], '#2f7d4f', '#7fb98a'],
              'circle-stroke-width': 2,
              'circle-stroke-color': '#ffffff',
            }}
          />
        </ML.GeoJSONSource>
      </ML.Map>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { height: 260, borderRadius: 14, overflow: 'hidden', marginBottom: 12, backgroundColor: '#e2ebe0' },
  map: { flex: 1 },
});
