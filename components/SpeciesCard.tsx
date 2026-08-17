import { Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import type { HelpKind, TierState } from '../lib/collection';
import { EMPTY_TIER_STATE } from '../lib/collection';
import { isDepthUnlocked, MAX_DEPTH } from '../lib/depthTier';
import { dualTitle, type DualTextInput } from '../lib/dualLanguageFormat';
import { isolate, writingDirectionFor } from '../lib/i18n/bidi';
import { createTranslator, type Locale } from '../lib/i18n';
import {
  endonymOf,
  needsMachineTranslationNotice,
  type ContentLocale,
} from '../lib/i18n/contentLocale';
import { commonNameFor } from '../lib/species/localized';
import { buildShareMessage } from '../lib/shareSpecies';
import type { SpeciesContent } from '../lib/species/content';
import type { Species } from '../lib/species/types';
import DualText from './DualText';
import SpeciesHero from './SpeciesHero';

// Species card (T-026 · USER-FLOWS §4). The always-free Tier-1 layer: fact, when/how trivia,
// and the give + protect mission actions (never gated — invariant #2). Below sits the depth-tier
// placeholder row (5 levels, climb-by-play; content authored in T-053) and a "find it nearby"
// entry into the Caught flow. Undiscovered species show a silhouette but the mission content is
// still free and visible. All chrome runs through i18n. Content is passed in (T-059): the caller
// loads it through the SpeciesRepository (locale + English fallback) so the source can swap from
// the bundled module to Supabase without touching the card. NOTE: on-device layout not yet verified.

const DEPTH_TIERS = Array.from({ length: MAX_DEPTH }, (_, i) => i + 1);

export default function SpeciesCard({
  species,
  content = null,
  locale = 'en',
  secondaryContent = null,
  secondaryLocale = null,
  tier = EMPTY_TIER_STATE,
  fullGame = false,
  onFindNearby,
  onPledge,
  nearbyNote,
  onBack,
}: {
  species: Species;
  /** Tier-1 content (fact/when-how/give/protect), loaded by the caller via SpeciesRepository
   * (T-059). `null` while loading or when no content exists yet — the mission block hides. */
  content?: SpeciesContent | null;
  locale?: Locale;
  /** Mother-tongue content shown alongside the primary (T-150). `null` ⇒ single-language card. */
  secondaryContent?: SpeciesContent | null;
  /** The mother tongue. `null` unless the user enabled dual display and picked a language. */
  secondaryLocale?: ContentLocale | null;
  tier?: TierState;
  /** Full Game entitlement unlocks all depth tiers immediately (T-060). */
  fullGame?: boolean;
  onFindNearby?: (species: Species) => void;
  /** Pledge a give/protect action → Helped tier (T-076). */
  onPledge?: (species: Species, kind: HelpKind) => void;
  /** Small caption under the find-nearby CTA — e.g. the free-catch counter (T-034). */
  nearbyNote?: string;
  onBack?: () => void;
}) {
  const tr = createTranslator(locale);
  const spotted = tier.spotted;

  // Dual display (F13.3): every text field pairs the app language with the mother tongue. The
  // formatter drops the second half per-field whenever it is missing, blank or identical, so a
  // partially-translated species degrades field by field instead of all-or-nothing.
  const dual = (primary: string, secondary?: string) => ({
    primary,
    primaryLocale: locale as ContentLocale,
    secondary: secondaryLocale ? secondary : null,
    secondaryLocale,
  });
  const name = dualTitle(
    dual(
      commonNameFor(species, locale),
      secondaryLocale ? commonNameFor(species, secondaryLocale) : undefined,
    ),
  );
  // Honesty (T-152/T-153): machine-translated content is always labelled, so the aid is never
  // mistaken for reviewed advice. Shown once for the card rather than repeated per section.
  //
  // This line mixes an RTL endonym with LTR chrome ("العربية · Machine-translated"), which caught
  // a real rendering bug (found by looking at a render, not by a test). React Native Web emits
  // `dir="auto"` on Text, and Chromium resolves that from the first strong character *without*
  // skipping isolate contents — unlike UAX #9's own P2 rule. So a leading Arabic endonym flipped
  // the whole line and it displayed reversed as "Machine-translated · العربية". Isolates alone do
  // NOT fix it; the line needs an explicit writing direction, taken from the primary (chrome)
  // language. The isolate stays as defence in depth around the embedded endonym.
  const mtNotice =
    secondaryLocale !== null && needsMachineTranslationNotice(secondaryLocale)
      ? `${isolate(endonymOf(secondaryLocale))} · ${tr('dual.machineTranslated')}`
      : null;
  const chromeDirection = writingDirectionFor(locale as ContentLocale);

  // Share is a clean delight moment — no upsell (invariant #4); honest, season-framed copy
  // (invariant #1). Text only for now; a deep link arrives with the store work. Failures/dismissal
  // are swallowed (Share rejects if a share is already open, or the user cancels).
  const shareSpecies = () => {
    void Share.share({ message: buildShareMessage(name, locale) }).catch(() => {});
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        {onBack ? (
          <Pressable onPress={onBack} accessibilityRole="button" style={styles.back}>
            <Text style={styles.backText}>‹ {tr('card.back')}</Text>
          </Pressable>
        ) : (
          <View />
        )}
        <Pressable
          onPress={shareSpecies}
          accessibilityRole="button"
          accessibilityLabel={tr('share.cta')}
          style={styles.share}
        >
          <Text style={styles.shareText}>↗ {tr('share.cta')}</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <SpeciesHero species={species} spotted={spotted} />
          <Text style={[styles.name, { writingDirection: chromeDirection }]}>{name}</Text>
          <Text style={styles.scientific}>{species.scientificName}</Text>
          {mtNotice ? (
            <Text style={[styles.mtNotice, { writingDirection: chromeDirection }]}>{mtNotice}</Text>
          ) : null}
          {!spotted ? <Text style={styles.notSpotted}>{tr('card.notSpotted')}</Text> : null}
        </View>

        {content ? (
          <>
            {/* No Wikipedia article → no fact (T-146); hide the block, keep the mission below. */}
            {content.fact ? (
              <DualText input={dual(content.fact, secondaryContent?.fact)} style={styles.fact} />
            ) : null}

            <Section
              title={tr('thisWeek.title')}
              input={dual(content.whenAndHow, secondaryContent?.whenAndHow)}
            />
            <Section
              title={tr('card.give')}
              input={dual(content.give, secondaryContent?.give)}
              accent="give"
            />
            {onPledge && !tier.helped ? (
              <PledgeButton label={tr('card.pledge')} onPress={() => onPledge(species, 'give')} />
            ) : null}
            <Section
              title={tr('card.protect')}
              input={dual(content.protect, secondaryContent?.protect)}
              accent="protect"
            />
            {onPledge && !tier.helped ? (
              <PledgeButton label={tr('card.pledge')} onPress={() => onPledge(species, 'protect')} />
            ) : null}
            <Text style={styles.law}>⚖ {tr('card.followLaw')}</Text>
          </>
        ) : null}

        <View style={styles.depthBlock}>
          <Text style={styles.depthLabel}>{tr('card.depth')}</Text>
          <View style={styles.depthRow}>
            {DEPTH_TIERS.map((level) => {
              // Tier-1 always free; 2–5 climb-by-play or Full Game (T-060).
              const unlocked = isDepthUnlocked(level, tier, fullGame);
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
        <View style={styles.ctaWrap}>
          <Pressable onPress={() => onFindNearby(species)} accessibilityRole="button" style={styles.cta}>
            <Text style={styles.ctaText}>{tr('card.findNearby')} →</Text>
          </Pressable>
          {nearbyNote ? <Text style={styles.nearbyNote}>{nearbyNote}</Text> : null}
        </View>
      ) : null}
    </View>
  );
}

function PledgeButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={styles.pledgeBtn}>
      <Text style={styles.pledgeBtnText}>✓ {label}</Text>
    </Pressable>
  );
}

function Section({
  title,
  input,
  accent,
}: {
  title: string;
  input: DualTextInput;
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
      <DualText input={input} style={styles.sectionBody} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f8f2' },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  back: { paddingVertical: 2 },
  backText: { fontSize: 16, color: '#3a7d44', fontWeight: '600' },
  share: { paddingVertical: 2, paddingLeft: 12 },
  shareText: { fontSize: 15, color: '#3a7d44', fontWeight: '600' },
  scroll: { paddingHorizontal: 20, paddingBottom: 24 },
  hero: { alignItems: 'center', paddingVertical: 20 },
  name: { marginTop: 8, fontSize: 26, fontWeight: '700', color: '#22331f', textAlign: 'center' },
  scientific: { marginTop: 2, fontSize: 14, fontStyle: 'italic', color: '#6a7c6d' },
  mtNotice: { marginTop: 6, fontSize: 11, color: '#7a8a7c' },
  notSpotted: { marginTop: 8, fontSize: 12, fontWeight: '700', color: '#7a8a7c', letterSpacing: 1 },
  fact: { fontSize: 17, lineHeight: 24, color: '#2f3d2c', marginBottom: 8 },
  section: { marginTop: 14 },
  sectionTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 1, color: '#4a5c4d', textTransform: 'uppercase' },
  giveTitle: { color: '#2f7d4f' },
  protectTitle: { color: '#2f5d8a' },
  sectionBody: { marginTop: 4, fontSize: 15, lineHeight: 21, color: '#2f3d2c' },
  pledgeBtn: { marginTop: 8, alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10, backgroundColor: '#e7f2e7', borderWidth: 1, borderColor: '#bcd9bd' },
  pledgeBtnText: { fontSize: 14, fontWeight: '600', color: '#2f7d4f' },
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
  ctaWrap: { margin: 20 },
  cta: { paddingVertical: 16, borderRadius: 14, backgroundColor: '#3a7d44', alignItems: 'center' },
  ctaText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  nearbyNote: { marginTop: 8, fontSize: 12, color: '#7a8a7c', textAlign: 'center' },
});
