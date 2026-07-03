import { FlatList, StyleSheet, Text, View } from 'react-native';
import { monthOf } from '../lib/season';
import { thisWeek, type ThisWeekEntry } from '../lib/thisWeek';
import { KRONOBERG_CONTENT } from '../lib/species/content';
import { KRONOBERG_SPECIES } from '../lib/species/kronoberg';
import type { SpeciesCategory } from '../lib/species/types';

// First rendered prototype screen (T-117): the "Active this week" pull surface (USER-FLOWS §3)
// driven by the real Kronoberg seed data and the tested `thisWeek` selection logic. Collection
// is empty for now (everything shows as NEW) until the store is wired into the UI.
// NOTE: not yet visually verified on a device — logic is unit-tested; layout needs a run.

const CATEGORY_EMOJI: Record<SpeciesCategory, string> = {
  bird: '🐦',
  mammal: '🦔',
  insect: '🦋',
  plant: '🌼',
  fish: '🐟',
  fungus: '🍄',
};

function Row({ entry }: { entry: ThisWeekEntry }) {
  const { species, isNew } = entry;
  const content = KRONOBERG_CONTENT[species.id];
  return (
    <View style={styles.row}>
      <Text style={styles.emoji}>{CATEGORY_EMOJI[species.category]}</Text>
      <View style={styles.rowText}>
        <View style={styles.rowHeader}>
          <Text style={styles.name}>{species.commonName}</Text>
          {isNew ? <Text style={styles.newBadge}>NEW</Text> : null}
        </View>
        <Text style={styles.detail}>{content?.whenAndHow ?? species.scientificName}</Text>
      </View>
    </View>
  );
}

export default function ThisWeekScreen() {
  const month = monthOf(new Date());
  const entries = thisWeek(KRONOBERG_SPECIES, month, new Set());

  return (
    <View style={styles.container}>
      <Text style={styles.title}>This week 🌿</Text>
      <Text style={styles.subtitle}>
        Kronoberg · {entries.length} species active in your area this season
      </Text>
      <FlatList
        data={entries}
        keyExtractor={(e) => e.species.id}
        renderItem={({ item }) => <Row entry={item} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.detail}>A quiet week — winter is resting season here.</Text>}
      />
      <Text style={styles.footnote}>Active this season, never “here right now”.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f8f2', paddingTop: 64, paddingHorizontal: 20 },
  title: { fontSize: 28, fontWeight: '700', color: '#2f5d34' },
  subtitle: { marginTop: 4, marginBottom: 16, fontSize: 14, color: '#4a5c4d' },
  list: { paddingBottom: 24 },
  row: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#d4e0d2' },
  emoji: { fontSize: 24, marginRight: 12 },
  rowText: { flex: 1 },
  rowHeader: { flexDirection: 'row', alignItems: 'center' },
  name: { fontSize: 16, fontWeight: '600', color: '#22331f' },
  newBadge: { marginLeft: 8, fontSize: 11, fontWeight: '700', color: '#fff', backgroundColor: '#3a7d44', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, overflow: 'hidden' },
  detail: { marginTop: 2, fontSize: 13, color: '#4a5c4d' },
  footnote: { paddingVertical: 12, fontSize: 12, color: '#7a8a7c', fontStyle: 'italic' },
});
