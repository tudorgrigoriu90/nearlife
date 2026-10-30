import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { Entitlements } from '../lib/entitlement';
import { createTranslator, type Locale } from '../lib/i18n';
import type { PurchaseGateway } from '../lib/purchases';
import { countyList, regionAccess, type County } from '../lib/regionAccess';
import { regionProductId } from '../lib/revenuecatEvents';

// Counties (T-105). Every Swedish county, home first. Tapping a county shows it in This Week and the
// Almanac. A county you have not opened is a look-only preview, so you can see what is there before
// buying. A pack (29 SEK) or the all-of-Sweden pass (99 SEK) opens spotting and catching there.
// Prices are the store's strings. No timers or urgency, and never shown on a delight moment
// (invariant #4).

const ALL_REGIONS = 'all_regions';

export default function CountiesScreen({
  locale = 'en',
  homeId,
  entitlements,
  gateway,
  onView,
  onPurchased,
  onDone,
}: {
  locale?: Locale;
  homeId: string | null;
  entitlements: Entitlements;
  gateway: PurchaseGateway;
  /** Show this county in This Week and the Almanac. */
  onView: (county: County) => void;
  onPurchased?: () => void;
  onDone?: () => void;
}) {
  const tr = createTranslator(locale);
  const counties = useMemo(() => countyList(homeId, locale), [homeId, locale]);
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  const forSale = useMemo(
    () =>
      entitlements.allRegions
        ? []
        : [
            ALL_REGIONS,
            ...counties
              .filter((c) => regionAccess(c.id, homeId, entitlements) === 'locked')
              .map((c) => regionProductId(c.id)),
          ],
    [counties, homeId, entitlements],
  );

  useEffect(() => {
    if (!gateway.available() || forSale.length === 0) return;
    gateway
      .products(forSale)
      .then((found) => setPrices(Object.fromEntries(found.map((p) => [p.sku, p.priceString]))))
      .catch(() => setError(true));
  }, [gateway, forSale]);

  const buy = async (sku: string) => {
    setBusy(true);
    setError(false);
    try {
      if ((await gateway.purchase(sku)) === 'purchased') onPurchased?.();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{tr('counties.title')} 🗺</Text>
        {onDone ? (
          <Pressable onPress={onDone} accessibilityRole="button">
            <Text style={styles.done}>{tr('settings.done')}</Text>
          </Pressable>
        ) : null}
      </View>
      <Text style={styles.subtitle}>{tr('counties.intro')}</Text>

      <ScrollView contentContainerStyle={styles.scroll}>
        {prices[ALL_REGIONS] ? (
          <View style={styles.allCard}>
            <View style={styles.rowText}>
              <Text style={styles.allName}>{tr('counties.all.name')}</Text>
              <Text style={styles.allBody}>{tr('counties.all.body')}</Text>
            </View>
            <Pressable
              onPress={() => void buy(ALL_REGIONS)}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel={tr('counties.buyAll')}
              style={styles.buy}
            >
              <Text style={styles.buyText}>{prices[ALL_REGIONS]}</Text>
            </Pressable>
          </View>
        ) : null}

        {error ? <Text style={styles.error}>{tr('store.error')}</Text> : null}

        <View style={styles.card}>
          {counties.map((c, i) => {
            const access = regionAccess(c.id, homeId, entitlements);
            const price = prices[regionProductId(c.id)];
            return (
              <View key={c.id} style={[styles.row, i > 0 && styles.rowBorder]}>
                <Pressable
                  onPress={() => onView(c)}
                  accessibilityRole="button"
                  style={styles.rowText}
                >
                  <Text style={styles.county}>{c.name}</Text>
                  {access === 'home' ? <Text style={styles.tag}>{tr('counties.home')}</Text> : null}
                  {access === 'owned' ? <Text style={styles.tag}>{tr('counties.open')}</Text> : null}
                  {access === 'locked' ? <Text style={styles.hint}>{tr('counties.preview')}</Text> : null}
                </Pressable>
                {access === 'locked' && price ? (
                  <Pressable
                    onPress={() => void buy(regionProductId(c.id))}
                    disabled={busy}
                    accessibilityRole="button"
                    accessibilityLabel={tr('counties.buyCounty', { county: c.name })}
                    style={styles.buySmall}
                  >
                    <Text style={styles.buySmallText}>{price}</Text>
                  </Pressable>
                ) : null}
              </View>
            );
          })}
        </View>
        <Text style={styles.reassure}>{tr('paywall.freeMission')}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f8f2', paddingTop: 56, paddingHorizontal: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 },
  title: { fontSize: 28, fontWeight: '700', color: '#2f5d34' },
  done: { fontSize: 16, fontWeight: '600', color: '#3a7d44' },
  subtitle: { marginTop: 4, marginBottom: 16, fontSize: 14, lineHeight: 20, color: '#4a5c4d', paddingHorizontal: 4 },
  scroll: { paddingBottom: 32, gap: 12 },
  allCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 16, gap: 12 },
  allName: { fontSize: 17, fontWeight: '700', color: '#22331f' },
  allBody: { marginTop: 2, fontSize: 13, lineHeight: 18, color: '#4a5c4d' },
  card: { backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 16 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
  rowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#dfe7dc' },
  rowText: { flex: 1 },
  county: { fontSize: 16, fontWeight: '600', color: '#22331f' },
  tag: { marginTop: 2, fontSize: 12, fontWeight: '700', color: '#2f7d4f' },
  hint: { marginTop: 2, fontSize: 12, color: '#7a8a7c' },
  buy: { backgroundColor: '#3a7d44', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14 },
  buyText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  buySmall: { backgroundColor: '#eaf4ea', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12 },
  buySmallText: { color: '#2f7d4f', fontSize: 14, fontWeight: '700' },
  reassure: { fontSize: 14, fontWeight: '600', color: '#2f7d4f', paddingHorizontal: 4 },
  error: { fontSize: 14, color: '#b3402f', textAlign: 'center' },
});
