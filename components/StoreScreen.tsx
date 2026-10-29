import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { Entitlements } from '../lib/entitlement';
import { createTranslator, type Locale, type TranslationKey } from '../lib/i18n';
import type { PurchaseGateway, Sku, StoreProduct } from '../lib/purchases';

// Store (T-085 · USER-FLOWS §8). Two one-time products, stated plainly: the Full Game and Family.
// Prices are the store's own localized strings, never computed here, so a price change in Play
// Console needs no release. No timers, no urgency, no dark patterns; the mission-is-free and
// no-ads reassurances always show. Reached from the out-of-free-catches sheet (the one sales
// signal) and from Settings, never from a delight moment (invariant #4).
//
// "Owned" comes from the server (lib/entitlement.ts), not from the store SDK: after a purchase the
// webhook grants it (T-217) and `onPurchased` makes the app re-read.

const COPY: Record<Sku, { name: TranslationKey; body: TranslationKey }> = {
  full_game: { name: 'store.fullGame.name', body: 'store.fullGame.body' },
  family: { name: 'store.family.name', body: 'store.family.body' },
};

export default function StoreScreen({
  locale = 'en',
  gateway,
  entitlements,
  onPurchased,
  onDone,
}: {
  locale?: Locale;
  gateway: PurchaseGateway;
  entitlements: Entitlements;
  onPurchased?: () => void;
  onDone?: () => void;
}) {
  const tr = createTranslator(locale);
  const canBuy = gateway.available();
  const [products, setProducts] = useState<StoreProduct[] | null>(canBuy ? null : []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!canBuy) return;
    gateway
      .products()
      .then(setProducts)
      .catch(() => {
        setProducts([]);
        setError(true);
      });
  }, [gateway, canBuy]);

  const owned = (sku: Sku) => (sku === 'family' ? entitlements.family : entitlements.fullGame);

  const act = async (action: () => Promise<unknown>, notify: (result: unknown) => boolean) => {
    setBusy(true);
    setError(false);
    try {
      if (notify(await action())) onPurchased?.();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{tr('store.title')}</Text>
        {onDone ? (
          <Pressable onPress={onDone} accessibilityRole="button">
            <Text style={styles.done}>{tr('settings.done')}</Text>
          </Pressable>
        ) : null}
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {!canBuy ? <Text style={styles.note}>{tr('store.unavailable')}</Text> : null}
        {products === null ? <ActivityIndicator color="#3a7d44" /> : null}
        {(products ?? []).map((p) => (
          <View key={p.sku} style={styles.card}>
            <View style={styles.cardHead}>
              <Text style={styles.name}>{tr(COPY[p.sku].name)}</Text>
              <Text style={styles.price}>{p.priceString}</Text>
            </View>
            <Text style={styles.body}>{tr(COPY[p.sku].body)}</Text>
            {owned(p.sku) ? (
              <Text style={styles.owned}>{tr('store.owned')}</Text>
            ) : (
              <Pressable
                onPress={() => void act(() => gateway.purchase(p.sku), (r) => r === 'purchased')}
                disabled={busy}
                accessibilityRole="button"
                style={[styles.buy, busy && styles.busy]}
              >
                <Text style={styles.buyText}>{tr('store.buy')}</Text>
              </Pressable>
            )}
          </View>
        ))}

        <Text style={styles.reassure}>{tr('paywall.freeMission')}</Text>
        <Text style={styles.reassure}>{tr('paywall.noAds')}</Text>
        {error ? <Text style={styles.error}>{tr('store.error')}</Text> : null}

        {canBuy ? (
          <Pressable
            onPress={() => void act(() => gateway.restore(), () => true)}
            disabled={busy}
            accessibilityRole="button"
            style={styles.restore}
          >
            <Text style={styles.restoreText}>{tr('store.restore')}</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f8f2', paddingTop: 56, paddingHorizontal: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, marginBottom: 16 },
  title: { fontSize: 28, fontWeight: '700', color: '#2f5d34' },
  done: { fontSize: 16, fontWeight: '600', color: '#3a7d44' },
  scroll: { paddingBottom: 32, gap: 12 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, gap: 8 },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  name: { fontSize: 18, fontWeight: '700', color: '#22331f' },
  price: { fontSize: 18, fontWeight: '700', color: '#3a7d44' },
  body: { fontSize: 14, lineHeight: 20, color: '#4a5c4d' },
  buy: { marginTop: 4, backgroundColor: '#3a7d44', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  busy: { opacity: 0.6 },
  buyText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  owned: { marginTop: 4, fontSize: 15, fontWeight: '700', color: '#2f7d4f' },
  reassure: { fontSize: 14, fontWeight: '600', color: '#2f7d4f', paddingHorizontal: 4 },
  note: { fontSize: 14, lineHeight: 20, color: '#7a8a7c', fontStyle: 'italic', paddingHorizontal: 4 },
  error: { fontSize: 14, color: '#b3402f', textAlign: 'center' },
  restore: { paddingVertical: 12, alignItems: 'center' },
  restoreText: { fontSize: 14, color: '#4a5c4d', fontWeight: '600', textDecorationLine: 'underline' },
});
