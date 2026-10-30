import { useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { almanacEntries, categoryCounts, discoveredCount, type AlmanacEntry } from '../lib/almanac';
import { progressSummary, type CollectionRecord } from '../lib/collection';
import { createTranslator, type Locale, type TranslationKey } from '../lib/i18n';
import { photoFor } from '../lib/species/media';
import { commonNameFor } from '../lib/species/localized';
import { monthOf } from '../lib/season';
import { groupOf, type SpeciesGroup } from '../lib/species/group';
import type { Habitat, Month, Species } from '../lib/species/types';
import { CATEGORY_EMOJI, GROUP_LABEL_KEY, speciesGlyph } from './speciesVisual';

// Almanac grid (T-025 · USER-FLOWS §2). Every species with ●/◐/◑ tier overlays; undiscovered
// species show as a greyed silhouette; category filter chips narrow the grid. Empty and loading
// states included. All chrome runs through i18n (invariant #7); species names localize via
// commonNameFor. Collection is passed in — an in-memory store now (T-116), Supabase later (T-056).
// NOTE: logic is unit-tested (lib/almanac.test.ts); on-device layout not yet visually verified.

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

// Spotted cells show the species' photo (T-126); undiscovered ones keep the silhouette, so spotting
// is still the moment a species is revealed. The photo comes with the catalogue read (T-215), so
// the grid costs no extra requests, only image loads, which FlatList virtualizes. Attribution is
// one tap away on the card, which shows author + licence in full. The CC licences allow credit "in
// any reasonable manner based on the medium", and a 56 px thumbnail cannot carry a readable one.
function CellVisual({ species, discovered }: { species: Species; discovered: boolean }) {
  const [failed, setFailed] = useState(false);
  const photo = discovered ? photoFor(species) : null;
  if (photo && !failed) {
    return (
      <Image
        testID={`almanac-photo-${species.id}`}
        source={{ uri: photo.url }}
        style={styles.cellPhoto}
        resizeMode="cover"
        onError={() => setFailed(true)}
      />
    );
  }
  return <Text style={styles.cellEmoji}>{speciesGlyph(groupOf(species), discovered)}</Text>;
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
      <CellVisual species={species} discovered={discovered} />
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
  onOpenBadges,
  onOpenImpact,
  month = monthOf(new Date()),
}: {
  species: Species[];
  records?: CollectionRecord[];
  locale?: Locale;
  loading?: boolean;
  onSelectSpecies?: (species: Species) => void;
  /** Entry points to the Badges (T-082) / Impact (T-081) screens, shown when provided (T-058). */
  onOpenBadges?: () => void;
  onOpenImpact?: () => void;
  /** The month "Active this month" filters on; injectable for tests. */
  month?: Month;
}) {
  const tr = createTranslator(locale);
  const [category, setCategory] = useState<SpeciesGroup | null>(null);
  // With 3,000+ species in a county list, "what can I find now" is the useful cut (T-057). It is
  // the honest season window from the presence data, never "here right now" (invariant #1).
  const [activeNow, setActiveNow] = useState(false);
  // Where to go looking (T-057): the habitats the catch screen sends people to.
  const [habitat, setHabitat] = useState<Habitat | null>(null);
  const entries = almanacEntries(
    species,
    records,
    category ?? undefined,
    activeNow ? month : undefined,
    habitat ?? undefined,
  );
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

      {onOpenBadges || onOpenImpact ? (
        <View style={styles.linkRow}>
          {onOpenBadges ? (
            <Pressable onPress={onOpenBadges} accessibilityRole="button" style={styles.linkBtn}>
              <Text style={styles.linkText}>🏅 {tr('nav.badges')}</Text>
            </Pressable>
          ) : null}
          {onOpenImpact ? (
            <Pressable onPress={onOpenImpact} accessibilityRole="button" style={styles.linkBtn}>
              <Text style={styles.linkText}>🌱 {tr('nav.impact')}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
      >
        <Chip
          label={`🗓 ${tr('almanac.filter.activeNow')}`}
          active={activeNow}
          onPress={() => setActiveNow((on) => !on)}
        />
        {HABITAT_CHIPS.map(([h, emoji, key]) => (
          <Chip
            key={h}
            label={`${emoji} ${tr(key)}`}
            active={habitat === h}
            onPress={() => setHabitat((current) => (current === h ? null : h))}
          />
        ))}
        <Chip label={tr('almanac.filter.all')} active={category === null} onPress={() => setCategory(null)} />
        {counts.map((c) => (
          <Chip
            key={c.category}
            label={`${CATEGORY_EMOJI[c.category]} ${tr(GROUP_LABEL_KEY[c.category])}`}
            active={category === c.category}
            onPress={() => setCategory(c.category)}
          />
        ))}
      </ScrollView>

      <FlatList
        data={entries}
        key={`${category ?? 'all'}-${activeNow ? 'now' : 'any'}-${habitat ?? 'anywhere'}`}
        keyExtractor={(e) => e.species.id}
        numColumns={3}
        columnWrapperStyle={styles.gridRow}
        renderItem={({ item }) => <Cell entry={item} locale={locale} onSelect={onSelectSpecies} />}
        contentContainerStyle={styles.grid}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {tr(activeNow ? 'almanac.activeNow.empty' : habitat ? 'almanac.habitat.empty' : 'almanac.empty')}
          </Text>
        }
      />
    </View>
  );
}

const HABITAT_CHIPS: [Habitat, string, TranslationKey][] = [
  ['land', '🌲', 'almanac.filter.land'],
  ['freshwater', '💧', 'almanac.filter.freshwater'],
  ['coast', '🌊', 'almanac.filter.coast'],
];

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
  linkRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 4, marginBottom: 10 },
  linkBtn: { flex: 1, backgroundColor: '#eaf4ea', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  linkText: { fontSize: 14, fontWeight: '600', color: '#2f7d4f' },
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
  // About the height of the 30 pt glyph's line, so a cell barely shifts when its photo loads.
  cellPhoto: { width: 56, height: 40, borderRadius: 8, backgroundColor: '#e2ebe0' },
  cellName: { marginTop: 6, fontSize: 12, fontWeight: '600', color: '#22331f', maxWidth: '90%' },
  tierRow: { flexDirection: 'row', marginTop: 6, gap: 3 },
  tierGlyph: { fontSize: 11, marginHorizontal: 1 },
  tierOn: { color: '#3a7d44' },
  tierOff: { color: '#cdd8ca' },
  detail: { marginTop: 8, fontSize: 13, color: '#4a5c4d' },
  empty: { textAlign: 'center', marginTop: 40, fontSize: 14, color: '#7a8a7c', fontStyle: 'italic' },
});
