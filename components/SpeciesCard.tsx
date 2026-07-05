import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { TierState } from '../lib/collection';
import { EMPTY_TIER_STATE } from '../lib/collection';
import { createTranslator, type Locale } from '../lib/i18n';
import { commonNameFor, contentFor } from '../lib/species/localized';
import type { Species } from '../lib/species/types';
import { speciesGlyph } from './speciesVisual';

// Species card (T-026 · USER-FLOWS §4). The always-free Tier-1 layer: fact, when/how trivia,
// and the give + protect mission actions (never gated — invariant #2). Below sits the depth-tier
// placeholder row (5 levels, climb-by-play; content authored in T-053) and a "find it nearby"
// entry into the Caught flow. Undiscovered species show a silhouette but the mission content is
// still free and visible. All chrome runs through i18n; content localizes via contentFor.
// NOTE: on-device layout not yet visually verified — no simulator in this environment.

const DEPTH_TIERS = [1, 2, 3, 4, 5] as const;

export default function SpeciesCard({
  species,
  locale = 'en',
  tier = EMPTY_TIER_STATE,
  onFindNearby,
  onBack,
}: {
  species: Species;
  locale?: Locale;
  tier?: TierState;
  onFindNearby?: (species: Species) => void;
  onBack?: () => void;
}) {
  const tr = createTranslator(locale);
  const content = contentFor(species.id, locale);
  const name = commonNameFor(species, locale);
  const spotted = tier.spotted;

  return (
    <View style={styles.container}>
      {onBack ? (
        <Pressable onPress={onBack} accessibilityRole="button" style={styles.back}>
          <Text style={styles.backText}>‹ {tr('card.back')}</Text>
        </Pressable>
      ) : null}

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Text style={styles.heroEmoji}>{speciesGlyph(species.category, spotted)}</Text>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.scientific}>{species.scientificName}</Text>
          {!spotted ? <Text style={styles.notSpotted}>{tr('card.notSpotted')}</Text> : null}
        </View>

        {content ? (
          <>
            <Text style={styles.fact}>{content.fact}</Text>

            <Section title={tr('thisWeek.title')} body={content.whenAndHow} />
            <Section title={tr('card.give')} body={content.give} accent="give" />
            <Section title={tr('card.protect')} body={content.protect} accent="protect" />
            <Text style={styles.law}>⚖ {tr('card.followLaw')}</Text>
          </>
        ) : null}

        <View style={styles.depthBlock}>
          <Text style={styles.depthLabel}>{tr('card.depth')}</Text>
          <View style={styles.depthRow}>
            {DEPTH_TIERS.map((level) => {
              const unlocked = level === 1; // Tier-1 always free; 2–5 climb-by-play (T-053/T-060).
              return (
                <View
                  key={level}
                  style={[styles.depthPill, unlocked ? styles.depthUnlocked : styles.depthLocked]}
                >
                  <Text style={[styles.depthNum, unlocked && styles.depthNumUnlocked]}>{level}</Text>
                </View>
              );
            })}
          </View>
          <Text style={styles.depthHint}>{tr('card.locked')}</Text>
        </View>
      </ScrollView>

      {onFindNearby ? (
        <Pressable onPress={() => onFindNearby(species)} accessibilityRole="button" style={styles.cta}>
          <Text style={styles.ctaText}>{tr('card.findNearby')} →</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function Section({
  title,
  body,
  accent,
}: {
  title: string;
  body: string;
  accent?: 'give' | 'protect';
}) {
  const titleStyle = [
    styles.sectionTitle,
    accent === 'give' && styles.giveTitle,
    accent === 'protect' && styles.protectTitle,
  ];
  return (
    <View style={styles.section}>
      <Text style={titleStyle}>{title}</Text>
      <Text style={styles.sectionBody}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f8f2' },
  back: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 4 },
  backText: { fontSize: 16, color: '#3a7d44', fontWeight: '600' },
  scroll: { paddingHorizontal: 20, paddingBottom: 24 },
  hero: { alignItems: 'center', paddingVertical: 20 },
  heroEmoji: { fontSize: 72 },
  name: { marginTop: 8, fontSize: 26, fontWeight: '700', color: '#22331f', textAlign: 'center' },
  scientific: { marginTop: 2, fontSize: 14, fontStyle: 'italic', color: '#6a7c6d' },
  notSpotted: { marginTop: 8, fontSize: 12, fontWeight: '700', color: '#7a8a7c', letterSpacing: 1 },
  fact: { fontSize: 17, lineHeight: 24, color: '#2f3d2c', marginBottom: 8 },
  section: { marginTop: 14 },
  sectionTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 1, color: '#4a5c4d', textTransform: 'uppercase' },
  giveTitle: { color: '#2f7d4f' },
  protectTitle: { color: '#2f5d8a' },
  sectionBody: { marginTop: 4, fontSize: 15, lineHeight: 21, color: '#2f3d2c' },
  law: { marginTop: 16, fontSize: 12, color: '#7a8a7c', fontStyle: 'italic' },
  depthBlock: { marginTop: 24, paddingTop: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#d4e0d2' },
  depthLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 1, color: '#4a5c4d', textTransform: 'uppercase' },
  depthRow: { flexDirection: 'row', marginTop: 8, gap: 8 },
  depthPill: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  depthUnlocked: { backgroundColor: '#3a7d44' },
  depthLocked: { backgroundColor: '#e2ebe0' },
  depthNum: { fontSize: 15, fontWeight: '700', color: '#9fb0a0' },
  depthNumUnlocked: { color: '#fff' },
  depthHint: { marginTop: 8, fontSize: 12, color: '#7a8a7c', fontStyle: 'italic' },
  cta: { margin: 20, paddingVertical: 16, borderRadius: 14, backgroundColor: '#3a7d44', alignItems: 'center' },
  ctaText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
