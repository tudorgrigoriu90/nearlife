import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { createTranslator, type Locale } from '../lib/i18n';
import { monthOf } from '../lib/season';
import { thisWeek, type ThisWeekEntry } from '../lib/thisWeek';
import { activeEvents } from '../lib/liveEvents';
import { commonNameFor, contentFor } from '../lib/species/localized';
import { KRONOBERG_SPECIES } from '../lib/species/kronoberg';
import type { Species } from '../lib/species/types';
import type { LiveThisWeek } from '../lib/thisWeekLive';
import { CATEGORY_EMOJI } from './speciesVisual';
import { LIVE_EVENT_META } from './liveEventVisual';

// "Active this week" pull surface (USER-FLOWS §3). With a hometown it shows the user's own county
// from the database (`live`, T-207); without one (preview mode) or before it loads, the bundled
// Kronoberg seed list via the tested `thisWeek` logic (T-111). All chrome strings run through i18n (T-121); species names
// and content localize in T-122. NEW markers reflect the user's collection via `spottedIds`
// (T-028). This surface is fully self-contained — it never depends on notifications, proving the
// app isn't notification-driven. NOTE: not yet visually verified on a device.

interface RowData {
  species: Species;
  name: string;
  detail: string;
  isNew: boolean;
}

function Row({
  row,
  newLabel,
  onSelect,
}: {
  row: RowData;
  newLabel: string;
  onSelect?: (species: Species) => void;
}) {
  const { species, name, detail, isNew } = row;
  return (
    <Pressable
      style={styles.row}
      onPress={() => onSelect?.(species)}
      accessibilityRole="button"
      accessibilityLabel={name}
    >
      <Text style={styles.emoji}>{CATEGORY_EMOJI[species.category]}</Text>
      <View style={styles.rowText}>
        <View style={styles.rowHeader}>
          <Text style={styles.name}>{name}</Text>
          {isNew ? <Text style={styles.newBadge}>{newLabel}</Text> : null}
        </View>
        <Text style={styles.detail}>{detail}</Text>
      </View>
    </Pressable>
  );
}

function bundledRow(entry: ThisWeekEntry, locale: Locale): RowData {
  const { species, isNew } = entry;
  const content = contentFor(species.id, locale);
  return {
    species,
    name: commonNameFor(species, locale),
    detail: content?.whenAndHow ?? species.scientificName,
    isNew,
  };
}

// Live-events strip (T-080): the real seasonal moments genuinely under way this month, rendered
// only when there are any (nothing shows out of season). Honest by construction — the windows come
// from the tested core (lib/liveEvents.ts). Scrolls with the list as its header.
function EventsHeader({ locale, tr }: { locale: Locale; tr: ReturnType<typeof createTranslator> }) {
  const events = activeEvents(new Date()).filter((e) => LIVE_EVENT_META[e.id]);
  if (events.length === 0) return null;
  return (
    <View style={styles.events}>
      <Text style={styles.eventsTitle}>{tr('events.title')}</Text>
      {events.map((event) => {
        const meta = LIVE_EVENT_META[event.id];
        return (
          <View key={event.id} style={styles.eventCard}>
            <Text style={styles.eventEmoji}>{meta.emoji}</Text>
            <View style={styles.rowText}>
              <Text style={styles.eventName}>{tr(meta.nameKey)}</Text>
              <Text style={styles.eventBlurb}>{tr(meta.blurbKey)}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

export default function ThisWeekScreen({
  locale = 'en',
  spottedIds,
  onSelectSpecies,
  live = null,
  regionName,
  onOpenCounties,
  travel,
  onIdentify,
}: {
  locale?: Locale;
  spottedIds?: ReadonlySet<string>;
  onSelectSpecies?: (species: Species) => void;
  /** The user's county list (T-207); null → the bundled preview list. */
  live?: LiveThisWeek | null;
  regionName?: string;
  /** Show the Counties screen (T-105): look around, or open, another county. */
  onOpenCounties?: () => void;
  /** The phone is in another county (T-218): a quiet offer to look around there. */
  travel?: { county: string; onLook: () => void; onDismiss: () => void } | null;
  /** Hand off to Seek by iNaturalist to identify something (T-223). */
  onIdentify?: () => void;
}) {
  const tr = createTranslator(locale);
  const month = monthOf(new Date());
  const rows: RowData[] =
    live !== null
      ? live.items.map((item) => ({
          species: item.species,
          name: item.commonName,
          detail: item.detail ?? item.species.scientificName,
          isNew: item.isNew,
        }))
      : thisWeek(KRONOBERG_SPECIES, month, spottedIds ?? new Set()).map((e) => bundledRow(e, locale));
  const count = live !== null ? live.total : rows.length;
  const region = live !== null && regionName ? regionName : tr('region.kronoberg');

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{tr('thisWeek.title')} 🌿</Text>
      <Text style={styles.subtitle}>
        {tr('thisWeek.subtitle', { region, count })}
      </Text>
      {travel ? (
        <View style={styles.travel}>
          <Text style={styles.travelText}>{tr('travel.banner', { county: travel.county })}</Text>
          <View style={styles.travelActions}>
            <Pressable onPress={travel.onLook} accessibilityRole="button" style={styles.travelLook}>
              <Text style={styles.travelLookText}>{tr('travel.look')}</Text>
            </Pressable>
            <Pressable onPress={travel.onDismiss} accessibilityRole="button" style={styles.travelLater}>
              <Text style={styles.travelLaterText}>{tr('travel.notNow')}</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
      {onOpenCounties || onIdentify ? (
        <View style={styles.links}>
          {onOpenCounties ? (
            <Pressable onPress={onOpenCounties} accessibilityRole="button" style={styles.countiesLink}>
              <Text style={styles.countiesText}>🗺 {tr('counties.title')}</Text>
            </Pressable>
          ) : null}
          {onIdentify ? (
            <Pressable
              onPress={onIdentify}
              accessibilityRole="link"
              accessibilityHint={tr('identify.hint')}
              style={styles.countiesLink}
            >
              <Text style={styles.countiesText}>📷 {tr('identify.cta')}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      <FlatList
        data={rows}
        keyExtractor={(r) => r.species.id}
        renderItem={({ item }) => (
          <Row row={item} newLabel={tr('thisWeek.new')} onSelect={onSelectSpecies} />
        )}
        ListHeaderComponent={<EventsHeader locale={locale} tr={tr} />}
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
  travel: { backgroundColor: '#eaf4ea', borderRadius: 12, padding: 12, marginBottom: 12 },
  travelText: { fontSize: 14, lineHeight: 20, color: '#22331f' },
  travelActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  travelLook: { backgroundColor: '#3a7d44', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14 },
  travelLookText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  travelLater: { paddingVertical: 8, paddingHorizontal: 8 },
  travelLaterText: { color: '#4a5c4d', fontSize: 14, fontWeight: '600' },
  links: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 20, marginTop: -8, marginBottom: 12 },
  countiesLink: { paddingVertical: 4 },
  countiesText: { fontSize: 14, fontWeight: '600', color: '#2f7d4f' },
  list: { paddingBottom: 24 },
  events: { marginBottom: 8 },
  eventsTitle: { fontSize: 12, fontWeight: '700', color: '#7a8a7c', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 },
  eventCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#eaf3e6', borderRadius: 12, padding: 12, marginBottom: 8 },
  eventEmoji: { fontSize: 26, marginRight: 12 },
  eventName: { fontSize: 15, fontWeight: '700', color: '#2f5d34' },
  eventBlurb: { marginTop: 2, fontSize: 13, color: '#4a5c4d' },
  row: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#d4e0d2' },
  emoji: { fontSize: 24, marginRight: 12 },
  rowText: { flex: 1 },
  rowHeader: { flexDirection: 'row', alignItems: 'center' },
  name: { fontSize: 16, fontWeight: '600', color: '#22331f' },
  newBadge: { marginLeft: 8, fontSize: 11, fontWeight: '700', color: '#fff', backgroundColor: '#3a7d44', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, overflow: 'hidden' },
  detail: { marginTop: 2, fontSize: 13, color: '#4a5c4d' },
  footnote: { paddingVertical: 12, fontSize: 12, color: '#7a8a7c', fontStyle: 'italic' },
});
