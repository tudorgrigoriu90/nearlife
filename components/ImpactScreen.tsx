import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import type { CollectionRecord } from '../lib/collection';
import { createTranslator, type Locale } from '../lib/i18n';
import { impactSummary } from '../lib/impact';

// Impact screen (T-081 · GDD §7). Shows the help the user has pledged this season, from the tested
// pure core (lib/impact.ts). Honest by construction (invariant #1): it counts only real pledges —
// no invented community numbers. Collective/community totals need the server-side aggregation
// (impact_counters refreshed by cron); until that exists we say so plainly rather than show a
// fabricated figure. No upsell (invariant #4). NOTE: on-device layout not visually verified.

export default function ImpactScreen({
  locale = 'en',
  records = [],
  onDone,
}: {
  locale?: Locale;
  records?: CollectionRecord[];
  onDone?: () => void;
}) {
  const tr = createTranslator(locale);
  const summary = impactSummary(records);
  const hasPledges = summary.totalPledges > 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{tr('impact.title')} 🌱</Text>
        {onDone ? (
          <Pressable onPress={onDone} accessibilityRole="button">
            <Text style={styles.done}>{tr('settings.done')}</Text>
          </Pressable>
        ) : null}
      </View>
      <Text style={styles.subtitle}>{tr('impact.subtitle')}</Text>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {hasPledges ? (
          <View style={styles.statsRow}>
            <Stat glyph="🐾" label={tr('impact.helpedSpecies')} count={summary.helpedSpecies} />
            <Stat glyph="🎁" label={tr('impact.give')} count={summary.give} />
            <Stat glyph="🛡" label={tr('impact.protect')} count={summary.protect} />
          </View>
        ) : (
          <Text style={styles.empty}>{tr('impact.empty')}</Text>
        )}

        <Text style={styles.community}>{tr('impact.community')}</Text>
      </ScrollView>
    </View>
  );
}

function Stat({ glyph, label, count }: { glyph: string; label: string; count: number }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statGlyph}>{glyph}</Text>
      <Text style={styles.statCount}>{count}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f8f2', paddingTop: 56, paddingHorizontal: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 },
  title: { fontSize: 28, fontWeight: '700', color: '#2f5d34' },
  done: { fontSize: 16, fontWeight: '600', color: '#3a7d44' },
  subtitle: { marginTop: 4, marginBottom: 16, fontSize: 14, color: '#4a5c4d', paddingHorizontal: 4 },
  scroll: { paddingBottom: 32 },
  statsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 4 },
  stat: { flex: 1, backgroundColor: '#fff', borderRadius: 12, paddingVertical: 18, alignItems: 'center' },
  statGlyph: { fontSize: 28 },
  statCount: { marginTop: 6, fontSize: 22, fontWeight: '700', color: '#3a7d44' },
  statLabel: { marginTop: 4, fontSize: 12, color: '#4a5c4d', textAlign: 'center', paddingHorizontal: 4 },
  empty: { marginTop: 24, fontSize: 15, lineHeight: 22, color: '#7a8a7c', textAlign: 'center', fontStyle: 'italic', paddingHorizontal: 12 },
  community: { marginTop: 24, fontSize: 12, color: '#9fb0a0', textAlign: 'center', fontStyle: 'italic', paddingHorizontal: 12 },
});
