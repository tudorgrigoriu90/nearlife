import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  categoryBadgeId,
  earnedBadges,
  HELPED_MILESTONES,
  SPOTTED_MILESTONES,
} from '../lib/badges';
import type { CollectionRecord } from '../lib/collection';
import { createTranslator, type Locale, type TranslationKey } from '../lib/i18n';
import type { Species, SpeciesCategory } from '../lib/species/types';
import { CATEGORY_EMOJI } from './speciesVisual';

// Badges & completion screen (T-082 · GDD §8). Presentational: the earn rules live in the tested
// pure core (lib/badges.ts). Shows the full badge set — earned ones lit, the rest as locked goals
// so there's always something to reach for. Category-completion + spotted/helped milestones are
// derivable now; habitat/season badges arrive with the real data layer (E3). No upsell (invariant
// #4). NOTE: on-device layout not visually verified.

const CATEGORY_KEY: Record<SpeciesCategory, TranslationKey> = {
  bird: 'category.bird',
  mammal: 'category.mammal',
  insect: 'category.insect',
  plant: 'category.plant',
  fish: 'category.fish',
  fungus: 'category.fungus',
};

interface BadgeItem {
  id: string;
  emoji: string;
  label: string;
  earned: boolean;
}

export default function BadgesScreen({
  locale = 'en',
  species,
  records = [],
  onDone,
}: {
  locale?: Locale;
  species: Species[];
  records?: CollectionRecord[];
  onDone?: () => void;
}) {
  const tr = createTranslator(locale);
  const earned = new Set(earnedBadges(records, species));

  // Full badge set, in the same order the core reports earned ids (categories → spotted → helped).
  const categories = [...new Set(species.map((s) => s.category))];
  const items: BadgeItem[] = [
    ...categories.map((c) => ({
      id: categoryBadgeId(c),
      emoji: CATEGORY_EMOJI[c],
      label: tr('badge.category', { category: tr(CATEGORY_KEY[c]) }),
      earned: earned.has(categoryBadgeId(c)),
    })),
    ...SPOTTED_MILESTONES.map((m) => ({
      id: `spotted-${m}`,
      emoji: '👁',
      label: tr('badge.spotted', { count: m }),
      earned: earned.has(`spotted-${m}`),
    })),
    ...HELPED_MILESTONES.map((m) => ({
      id: `helped-${m}`,
      emoji: '🤝',
      label: tr('badge.helped', { count: m }),
      earned: earned.has(`helped-${m}`),
    })),
  ];
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
});
