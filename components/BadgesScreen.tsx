import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { badgeStatuses, type BadgeStatus } from '../lib/badges';
import type { CollectionRecord } from '../lib/collection';
import { createTranslator, type Locale } from '../lib/i18n';
import type { Species } from '../lib/species/types';
import { CATEGORY_EMOJI, GROUP_LABEL_KEY } from './speciesVisual';

// Badges & completion screen (T-082 · GDD §8). Presentational: the earn rules live in the tested
// pure core (lib/badges.ts). Shows the full badge set — earned ones lit, the rest as locked goals
// so there's always something to reach for, with progress on each locked one. Group tiers
// (T-212), the season opener and spotted/helped milestones. No upsell (invariant #4).
// NOTE: on-device layout not visually verified.

interface BadgeItem {
  id: string;
  emoji: string;
  label: string;
  earned: boolean;
  progress: string;
}

const TIER_MEDALS = ['🥉', '🥈', '🥇'];

export default function BadgesScreen({
  locale = 'en',
  species,
  records = [],
  now,
  onDone,
}: {
  locale?: Locale;
  species: Species[];
  records?: CollectionRecord[];
  /** Today, for the season opener; injectable for tests. */
  now?: Date;
  onDone?: () => void;
}) {
  const tr = createTranslator(locale);
  const statuses = badgeStatuses(records, species, now ?? new Date());
  const tierIndex = new Map<string, number>();

  const label = (b: BadgeStatus): { emoji: string; label: string } => {
    if (b.kind === 'group-tier' && b.group) {
      const category = tr(GROUP_LABEL_KEY[b.group]).toLocaleLowerCase(locale);
      const index = tierIndex.get(b.group) ?? 0;
      tierIndex.set(b.group, index + 1);
      return b.all
        ? { emoji: '🏆', label: tr('badge.groupAll', { count: b.count, category }) }
        : { emoji: `${TIER_MEDALS[Math.min(index, 2)]}${CATEGORY_EMOJI[b.group]}`, label: tr('badge.groupTier', { count: b.count, category }) };
    }
    if (b.kind === 'season-opener') return { emoji: '🌱', label: tr('badge.seasonOpener') };
    if (b.kind === 'spotted-milestone') return { emoji: '👁', label: tr('badge.spotted', { count: b.count }) };
    return { emoji: '🤝', label: tr('badge.helped', { count: b.count }) };
  };
  const items: BadgeItem[] = statuses.map((b) => ({
    id: b.id,
    ...label(b),
    earned: b.earned,
    progress: tr('badge.progressOf', { have: b.progress, count: b.count }),
  }));
  const earnedCount = items.filter((b) => b.earned).length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{tr('badges.title')} 🏅</Text>
        {onDone ? (
          <Pressable onPress={onDone} accessibilityRole="button">
            <Text style={styles.done}>{tr('settings.done')}</Text>
          </Pressable>
        ) : null}
      </View>
      <Text style={styles.subtitle}>
        {tr('badges.progress', { earned: earnedCount, total: items.length })}
      </Text>

      <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
        {items.map((b) => (
          <View
            key={b.id}
            accessibilityRole="text"
            accessibilityState={{ selected: b.earned }}
            style={[styles.badge, b.earned ? styles.badgeEarned : styles.badgeLocked]}
          >
            <Text style={[styles.badgeEmoji, !b.earned && styles.locked]}>
              {b.earned ? b.emoji : '🔒'}
            </Text>
            <Text style={[styles.badgeLabel, !b.earned && styles.lockedLabel]} numberOfLines={2}>
              {b.label}
            </Text>
            {b.earned ? null : <Text style={styles.progress}>{b.progress}</Text>}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f8f2', paddingTop: 56, paddingHorizontal: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 },
  title: { fontSize: 28, fontWeight: '700', color: '#2f5d34' },
  done: { fontSize: 16, fontWeight: '600', color: '#3a7d44' },
  subtitle: { marginTop: 4, marginBottom: 12, fontSize: 14, color: '#4a5c4d', paddingHorizontal: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingBottom: 32 },
  badge: {
    width: '48%',
    borderRadius: 12,
    paddingVertical: 18,
    paddingHorizontal: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  badgeEarned: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#bcd9bd' },
  badgeLocked: { backgroundColor: '#eef2ec' },
  badgeEmoji: { fontSize: 34 },
  locked: { opacity: 0.5 },
  badgeLabel: { marginTop: 8, fontSize: 13, fontWeight: '600', color: '#22331f', textAlign: 'center' },
  lockedLabel: { color: '#7a8a7c', fontWeight: '500' },
  progress: { marginTop: 4, fontSize: 12, color: '#7a8a7c' },
});
