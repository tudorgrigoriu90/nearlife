import { FlatList, StyleSheet, Text, View } from 'react-native';
import { createTranslator, type Locale } from '../lib/i18n';
import { monthOf } from '../lib/season';
import { thisWeek, type ThisWeekEntry } from '../lib/thisWeek';
import { commonNameFor, contentFor } from '../lib/species/localized';
import { KRONOBERG_SPECIES } from '../lib/species/kronoberg';
import { CATEGORY_EMOJI } from './speciesVisual';

// "Active this week" pull surface (USER-FLOWS §3), driven by real Kronoberg seed data and the
// tested `thisWeek` logic (T-111). All chrome strings run through i18n (T-121); species names
// and content localize in T-122. NEW markers reflect the user's collection via `spottedIds`
// (T-028). This surface is fully self-contained — it never depends on notifications, proving the
// app isn't notification-driven. NOTE: not yet visually verified on a device.

function Row({
  entry,
  locale,
  newLabel,
}: {
  entry: ThisWeekEntry;
  locale: Locale;
  newLabel: string;
}) {
  const { species, isNew } = entry;
  const name = commonNameFor(species, locale);
  const content = contentFor(species.id, locale);
  return (
    <View style={styles.row}>
      <Text style={styles.emoji}>{CATEGORY_EMOJI[species.category]}</Text>
      <View style={styles.rowText}>
        <View style={styles.rowHeader}>
          <Text style={styles.name}>{name}</Text>
          {isNew ? <Text style={styles.newBadge}>{newLabel}</Text> : null}
        </View>
        <Text style={styles.detail}>{content?.whenAndHow ?? species.scientificName}</Text>
      </View>
    </View>
  );
}

export default function ThisWeekScreen({
  locale = 'en',
  spottedIds,
}: {
  locale?: Locale;
  spottedIds?: ReadonlySet<string>;
}) {
  const tr = createTranslator(locale);
  const month = monthOf(new Date());
  const entries = thisWeek(KRONOBERG_SPECIES, month, spottedIds ?? new Set());

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{tr('thisWeek.title')} 🌿</Text>
      <Text style={styles.subtitle}>
        {tr('thisWeek.subtitle', { region: tr('region.kronoberg'), count: entries.length })}
      </Text>
      <FlatList
        data={entries}
        keyExtractor={(e) => e.species.id}
        renderItem={({ item }) => (
          <Row entry={item} locale={locale} newLabel={tr('thisWeek.new')} />
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.detail}>{tr('thisWeek.empty')}</Text>}
      />
      <Text style={styles.footnote}>{tr('thisWeek.honesty')}</Text>
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
