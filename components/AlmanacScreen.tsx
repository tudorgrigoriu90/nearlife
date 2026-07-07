import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { almanacEntries, categoryCounts, discoveredCount, type AlmanacEntry } from '../lib/almanac';
import { progressSummary, type CollectionRecord } from '../lib/collection';
import { createTranslator, type Locale, type TranslationKey } from '../lib/i18n';
import { commonNameFor } from '../lib/species/localized';
import type { Species, SpeciesCategory } from '../lib/species/types';
import { CATEGORY_EMOJI, speciesGlyph } from './speciesVisual';

// Almanac grid (T-025 · USER-FLOWS §2). Every species with ●/◐/◑ tier overlays; undiscovered
// species show as a greyed silhouette; category filter chips narrow the grid. Empty and loading
// states included. All chrome runs through i18n (invariant #7); species names localize via
// commonNameFor. Collection is passed in — an in-memory store now (T-116), Supabase later (T-056).
// NOTE: logic is unit-tested (lib/almanac.test.ts); on-device layout not yet visually verified.

const CATEGORY_KEY: Record<SpeciesCategory, TranslationKey> = {
  bird: 'category.bird',
  mammal: 'category.mammal',
  insect: 'category.insect',
  plant: 'category.plant',
  fish: 'category.fish',
  fungus: 'category.fungus',
};

function TierOverlay({ entry }: { entry: AlmanacEntry }) {
  // ● Spotted / ◐ Caught / ◑ Helped — lit glyphs for reached tiers, faint for unreached.
  const glyphs: { char: string; on: boolean }[] = [
    { char: '●', on: entry.tier.spotted },
    { char: '◐', on: entry.tier.caught },
    { char: '◑', on: entry.tier.helped },
  ];
  return (
    <View style={styles.tierRow}>
      {glyphs.map((g, i) => (
        <Text key={i} style={[styles.tierGlyph, g.on ? styles.tierOn : styles.tierOff]}>
          {g.char}
        </Text>
      ))}
    </View>
  );
}

function Cell({
  entry,
  locale,
  onSelect,
}: {
  entry: AlmanacEntry;
  locale: Locale;
  onSelect?: (species: Species) => void;
}) {
  const { species, discovered } = entry;
  const name = discovered ? commonNameFor(species, locale) : '—';
  return (
    <Pressable
      style={[styles.cell, !discovered && styles.cellUndiscovered]}
      onPress={() => onSelect?.(species)}
      accessibilityRole="button"
      accessibilityLabel={discovered ? commonNameFor(species, locale) : undefined}
    >
      <Text style={styles.cellEmoji}>{speciesGlyph(species.category, discovered)}</Text>
      <Text style={styles.cellName} numberOfLines={1}>
        {name}
      </Text>
      <TierOverlay entry={entry} />
    </Pressable>
  );
}

export default function AlmanacScreen({
  species,
  records = [],
  locale = 'en',
  loading = false,
  onSelectSpecies,
}: {
  species: Species[];
  records?: CollectionRecord[];
  locale?: Locale;
  loading?: boolean;
  onSelectSpecies?: (species: Species) => void;
}) {
  const tr = createTranslator(locale);
  const [category, setCategory] = useState<SpeciesCategory | null>(null);
  const entries = almanacEntries(species, records, category ?? undefined);
  const counts = categoryCounts(species, records);
  const discovered = discoveredCount(species, records);
  const summary = progressSummary(records);

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator color="#3a7d44" />
        <Text style={styles.detail}>{tr('almanac.loading')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{tr('almanac.title')} 📖</Text>
      <Text style={styles.subtitle}>
        {tr('almanac.progress', { discovered, total: species.length })}
      </Text>

      <View style={styles.summaryRow}>
        <TierStat glyph="●" label={tr('tier.spotted')} count={summary.spotted} />
        <TierStat glyph="◐" label={tr('tier.caught')} count={summary.caught} />
        <TierStat glyph="◑" label={tr('tier.helped')} count={summary.helped} />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
      >
        <Chip label={tr('almanac.filter.all')} active={category === null} onPress={() => setCategory(null)} />
        {counts.map((c) => (
          <Chip
            key={c.category}
            label={`${CATEGORY_EMOJI[c.category]} ${tr(CATEGORY_KEY[c.category])}`}
            active={category === c.category}
            onPress={() => setCategory(c.category)}
          />
        ))}
      </ScrollView>

      <FlatList
        data={entries}
        key={category ?? 'all'}
        keyExtractor={(e) => e.species.id}
        numColumns={3}
        columnWrapperStyle={styles.gridRow}
        renderItem={({ item }) => <Cell entry={item} locale={locale} onSelect={onSelectSpecies} />}
        contentContainerStyle={styles.grid}
        ListEmptyComponent={<Text style={styles.empty}>{tr('almanac.empty')}</Text>}
      />
    </View>
  );
}

function TierStat({ glyph, label, count }: { glyph: string; label: string; count: number }) {
  return (
    <View style={styles.tierStat}>
      <Text style={styles.tierStatCount}>
        {glyph} {count}
      </Text>
      <Text style={styles.tierStatLabel}>{label}</Text>
    </View>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f8f2', paddingTop: 64, paddingHorizontal: 16 },
  centered: { alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '700', color: '#2f5d34', paddingHorizontal: 4 },
  subtitle: { marginTop: 4, marginBottom: 8, fontSize: 14, color: '#4a5c4d', paddingHorizontal: 4 },
  summaryRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 4, marginBottom: 10 },
  tierStat: { flex: 1, backgroundColor: '#fff', borderRadius: 10, paddingVertical: 8, alignItems: 'center' },
  tierStatCount: { fontSize: 16, fontWeight: '700', color: '#3a7d44' },
  tierStatLabel: { marginTop: 2, fontSize: 11, color: '#4a5c4d' },
  chips: { paddingVertical: 4, paddingHorizontal: 4, gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#e2ebe0', marginRight: 8 },
  chipActive: { backgroundColor: '#3a7d44' },
  chipText: { fontSize: 13, color: '#3a5a3d' },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  grid: { paddingVertical: 12, paddingBottom: 32 },
  gridRow: { justifyContent: 'space-between' },
  cell: {
    flex: 1,
    maxWidth: '31%',
    alignItems: 'center',
    paddingVertical: 14,
    marginBottom: 10,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  cellUndiscovered: { backgroundColor: '#eef2ec' },
  cellEmoji: { fontSize: 30 },
  cellName: { marginTop: 6, fontSize: 12, fontWeight: '600', color: '#22331f', maxWidth: '90%' },
  tierRow: { flexDirection: 'row', marginTop: 6, gap: 3 },
  tierGlyph: { fontSize: 11, marginHorizontal: 1 },
  tierOn: { color: '#3a7d44' },
  tierOff: { color: '#cdd8ca' },
  detail: { marginTop: 8, fontSize: 13, color: '#4a5c4d' },
  empty: { textAlign: 'center', marginTop: 40, fontSize: 14, color: '#7a8a7c', fontStyle: 'italic' },
});
