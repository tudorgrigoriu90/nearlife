import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { CollectionRecord, HelpKind, TierState } from '../lib/collection';
import { EMPTY_TIER_STATE } from '../lib/collection';
import { isDepthUnlocked, MAX_DEPTH } from '../lib/depthTier';
import { dualTitle, type DualTextInput } from '../lib/dualLanguageFormat';
import { isolate, writingDirectionFor } from '../lib/i18n/bidi';
import { createTranslator, type Locale, type TranslationKey } from '../lib/i18n';
import {
  endonymOf,
  needsMachineTranslationNotice,
  type ContentLocale,
} from '../lib/i18n/contentLocale';
import { commonNameFor, commonNameInLocale } from '../lib/species/localized';
import { READ_ALOUD_ENABLED } from '../lib/readAloud';
import { buildShareMessage } from '../lib/shareSpecies';
import type { SpeciesContent } from '../lib/species/content';
import type { IucnStatus, Month, Species } from '../lib/species/types';
import DualText from './DualText';
import SpeciesHero from './SpeciesHero';
import ReadAloud from './ReadAloud';
import CountySection from './CountySection';
import type { CountyStats } from '../lib/countyStats';
import BirdSong from './BirdSong';
import type { SoundSource } from '../lib/birdSound';
import { groupOf } from '../lib/species/group';
import { tierMarks } from '../lib/tierMarks';
import { adviceScope } from '../lib/adviceScope';
import { GROUP_LABEL_KEY } from './speciesVisual';

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
  findNearbyLabel,
  contentState,
  onRetryContent,
  backAround,
  onPledge,
  nearbyNote,
  soundSource,
  county = null,
  month,
  threat,
  onBack,
  onReportMistake,
  record = null,
  caughtThisSeason = false,
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
  /** The find button's label when it does something else, e.g. set the home county (T-272). */
  findNearbyLabel?: string;
  /**
   * Where the card's text stands (T-283 · review B-28): give and protect exist for every species
   * (invariant #2), so a card still waiting for them, or that failed to get them, says so.
   * Defaults to `ready` with content and `missing` without.
   */
  contentState?: 'loading' | 'ready' | 'missing' | 'error';
  onRetryContent?: () => void;
  /**
   * Set when the species is out of season in the county (T-268 · review B-26): the month it is
   * usually back. The card then offers no catch and says when instead.
   */
  backAround?: Month | null;
  /** Pledge a give/protect action → Helped tier (T-076). */
  onPledge?: (species: Species, kind: HelpKind) => void;
  /** Small caption under the find-nearby CTA — e.g. the free-catch counter (T-034). */
  nearbyNote?: string;
  /** Where a bird's recording comes from (T-246). Absent: no song button. Playable with the Full
   * Game only; otherwise shown disabled (T-249, T-250). */
  soundSource?: SoundSource;
  /** "Report a mistake" (T-293 · review I-32). Absent without a backend to send it to. */
  onReportMistake?: () => void;
  /** The user's record of this species: the tier marks' dates and what was pledged (T-298). */
  record?: CollectionRecord | null;
  /** Caught in the current season: the card shows that instead of offering a catch (T-298). */
  caughtThisSeason?: boolean;
  /** The species in the user's county (T-262); replaces the generic "this week" line. */
  county?: { name: string; stats: CountyStats } | null;
  /** This month, for the county chart. */
  month?: Month;
  /** Worldwide IUCN category when near threatened or worse (T-263). */
  threat?: IucnStatus;
  onBack?: () => void;
}) {
  const tr = createTranslator(locale);
  const spotted = tier.spotted;
  const marks = tierMarks(record, locale);

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
      // Exactly the second language, never the English fallback: "gråhäger / Grey Heron" passed
      // English off as Romanian (T-234).
      secondaryLocale
        ? (secondaryContent?.commonName ?? commonNameInLocale(species, secondaryLocale))
        : undefined,
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
  //
  // Only over text that is actually there (T-230): with no secondary content for this species the
  // card is all primary, and the label would pass that off as the translation.
  const mtNotice =
    secondaryLocale !== null &&
    secondaryContent !== null &&
    needsMachineTranslationNotice(secondaryLocale)
      ? `${isolate(endonymOf(secondaryLocale))} · ${tr('dual.machineTranslated')}`
      : null;
  const chromeDirection = writingDirectionFor(locale as ContentLocale);
  // The main language's own text is labelled too while its status is `machine` (T-283 · review
  // B-64): Swedish, the launch language, is not native-reviewed yet.
  const mainMachineText =
    content !== null && content !== undefined && needsMachineTranslationNotice(locale as ContentLocale);
  const textState = contentState ?? (content ? 'ready' : 'missing');

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
          <SpeciesHero species={species} spotted={spotted} locale={locale} />
          <Text style={[styles.name, { writingDirection: chromeDirection }]}>{name}</Text>
          <Text style={styles.scientific}>{species.scientificName}</Text>
          {threat ? (
            <Text style={styles.threat} testID="card-threat">
              ⚠️ {tr(`iucn.${threat}` as TranslationKey)} · {tr('iucn.source')}
            </Text>
          ) : null}
          {mainMachineText ? (
            <Text style={[styles.mtNotice, { writingDirection: chromeDirection }]}>
              {tr('card.machineText')}
            </Text>
          ) : null}
          {mtNotice ? (
            <Text style={[styles.mtNotice, { writingDirection: chromeDirection }]}>{mtNotice}</Text>
          ) : null}
          {!spotted ? <Text style={styles.notSpotted}>{tr('card.notSpotted')}</Text> : null}
          {marks.length > 0 ? (
            <View style={styles.marks}>
              {marks.map((m) => (
                <Text key={m.tier} style={styles.mark}>
                  {`${tr(`tier.${m.tier}`)} ${m.date}`}
                </Text>
              ))}
            </View>
          ) : null}
          {/* Read aloud (T-244), switched off for now (T-248). The second language's name, else
              its Latin name. */}
          {READ_ALOUD_ENABLED ? (
            <ReadAloud
              locale={locale}
              name={commonNameFor(species, locale)}
              content={content ?? null}
              secondary={
                secondaryLocale && secondaryContent
                  ? {
                      locale: secondaryLocale,
                      name:
                        secondaryContent.commonName ??
                        commonNameInLocale(species, secondaryLocale) ??
                        species.scientificName,
                      content: secondaryContent,
                    }
                  : null
              }
            />
          ) : null}
          {soundSource && groupOf(species) === 'bird' ? (
            <BirdSong
              speciesId={species.id}
              locale={locale}
              source={soundSource}
              locked={!fullGame}
            />
          ) : null}
        </View>

        {content ? (
          <>
            {/* No Wikipedia article → no fact (T-146); hide the block, keep the mission below. */}
            {content.fact ? (
              <>
                <DualText input={dual(content.fact, secondaryContent?.fact)} style={styles.fact} />
                <FactCredit content={content} locale={locale} />
                {secondaryContent?.fact &&
                secondaryContent.factSourceUrl !== content.factSourceUrl ? (
                  <FactCredit content={secondaryContent} locale={locale} />
                ) : null}
              </>
            ) : null}

            {county && month ? (
              <CountySection
                locale={locale}
                countyName={county.name}
                stats={county.stats}
                month={month}
              />
            ) : (
              <Section
                title={tr('thisWeek.title')}
                input={dual(content.whenAndHow, secondaryContent?.whenAndHow)}
              />
            )}
            <Section
              title={tr('card.give')}
              input={dual(content.give, secondaryContent?.give)}
              accent="give"
            />
            {onPledge && !tier.helped ? (
              <PledgeButton label={tr('card.pledge')} onPress={() => onPledge(species, 'give')} />
            ) : record?.helpedKind === 'give' ? (
              <Text style={styles.pledged}>{tr('card.pledged')}</Text>
            ) : null}
            <Section
              title={tr('card.protect')}
              input={dual(content.protect, secondaryContent?.protect)}
              accent="protect"
            />
            {onPledge && !tier.helped ? (
              <PledgeButton
                label={tr('card.pledge')}
                onPress={() => onPledge(species, 'protect')}
              />
            ) : record?.helpedKind === 'protect' ? (
              <Text style={styles.pledged}>{tr('card.pledged')}</Text>
            ) : null}
            {adviceScope(species.id) === 'group' ? (
              <Text style={styles.groupAdvice}>
                {tr('card.groupAdvice', {
                  group: tr(GROUP_LABEL_KEY[groupOf(species)]).toLocaleLowerCase(locale),
                })}
              </Text>
            ) : null}
            <Text style={styles.law}>⚖ {tr('card.followLaw')}</Text>
          </>
        ) : textState === 'loading' ? (
          <ActivityIndicator testID="card-content-loading" style={styles.contentState} color="#3a7d44" />
        ) : textState === 'error' ? (
          <View style={styles.contentState}>
            <Text style={styles.contentStateText}>{tr('card.contentError')}</Text>
            {onRetryContent ? (
              <Pressable onPress={onRetryContent} accessibilityRole="button">
                <Text style={styles.contentRetry}>{tr('thisWeek.retry')}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : (
          <Text style={[styles.contentState, styles.contentStateText]}>{tr('card.contentMissing')}</Text>
        )}

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
                  <Text style={[styles.depthNum, unlocked && styles.depthNumUnlocked]}>
                    {level}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {onReportMistake ? (
          <Pressable onPress={onReportMistake} accessibilityRole="button" style={styles.report}>
            <Text style={styles.reportText}>{tr('report.link')}</Text>
          </Pressable>
        ) : null}
      </ScrollView>

      {caughtThisSeason ? (
        <View style={styles.ctaWrap}>
          <Text style={styles.caughtNote}>{tr('card.caughtThisSeason')}</Text>
        </View>
      ) : backAround ? (
        <View style={styles.ctaWrap}>
          <Text style={styles.nearbyNote}>
            {tr('card.backAround', { month: tr('county.months').split('|')[backAround - 1] })}
          </Text>
        </View>
      ) : onFindNearby ? (
        <View style={styles.ctaWrap}>
          <Pressable
            onPress={() => onFindNearby(species)}
            accessibilityRole="button"
            style={styles.cta}
          >
            <Text style={styles.ctaText}>{findNearbyLabel ?? tr('card.findNearby')} →</Text>
          </Pressable>
          {nearbyNote ? <Text style={styles.nearbyNote}>{nearbyNote}</Text> : null}
        </View>
      ) : null}
    </View>
  );
}

/**
 * The credit a Wikipedia fact needs (T-276 · review B-59): source, licence, a link to the article,
 * and a note when the text is a machine translation. Nothing on the project's own text.
 */
function FactCredit({ content, locale }: { content: SpeciesContent; locale: Locale }) {
  const tr = createTranslator(locale);
  const url = content.factSourceUrl;
  if (!url || !content.factOrigin) return null;
  return (
    <Pressable
      onPress={() => void Linking.openURL(url).catch(() => undefined)}
      accessibilityRole="link"
    >
      <Text style={styles.factCredit}>
        {tr(
          content.factOrigin === 'wikipedia-translated'
            ? 'card.factCreditTranslated'
            : 'card.factCredit',
        )}
      </Text>
    </Pressable>
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
  groupAdvice: { marginTop: 8, fontSize: 12, fontStyle: 'italic', color: '#566658' },
  marks: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
  mark: { fontSize: 12, fontWeight: '700', color: '#336f3c' },
  pledged: { marginTop: 6, marginBottom: 4, fontSize: 13, fontWeight: '700', color: '#336f3c' },
  caughtNote: { textAlign: 'center', fontSize: 15, fontWeight: '700', color: '#336f3c', paddingVertical: 12 },
  report: { alignSelf: 'center', marginTop: 18, paddingVertical: 10, paddingHorizontal: 16 },
  reportText: { fontSize: 13, color: '#566658', textDecorationLine: 'underline' },
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
  backText: { fontSize: 16, color: '#336f3c', fontWeight: '600' },
  share: { paddingVertical: 2, paddingLeft: 12 },
  shareText: { fontSize: 15, color: '#336f3c', fontWeight: '600' },
  scroll: { paddingHorizontal: 20, paddingBottom: 24 },
  hero: { alignItems: 'center', paddingVertical: 20 },
  name: { marginTop: 8, fontSize: 26, fontWeight: '700', color: '#22331f', textAlign: 'center' },
  scientific: { marginTop: 2, fontSize: 14, fontStyle: 'italic', color: '#566658' },
  threat: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '600',
    color: '#8a4b1f',
    textAlign: 'center',
  },
  mtNotice: { marginTop: 6, fontSize: 11, color: '#566658' },
  contentState: { marginTop: 20, alignItems: 'center' },
  contentStateText: { fontSize: 14, color: '#566658', textAlign: 'center' },
  contentRetry: { marginTop: 8, fontSize: 15, fontWeight: '700', color: '#336f3c' },
  notSpotted: { marginTop: 8, fontSize: 12, fontWeight: '700', color: '#566658', letterSpacing: 1 },
  fact: { fontSize: 17, lineHeight: 24, color: '#2f3d2c', marginBottom: 8 },
  factCredit: { fontSize: 12, color: '#566658', textDecorationLine: 'underline', marginBottom: 8 },
  section: { marginTop: 14 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    color: '#4a5c4d',
    textTransform: 'uppercase',
  },
  giveTitle: { color: '#296f46' },
  protectTitle: { color: '#2f5d8a' },
  sectionBody: { marginTop: 4, fontSize: 15, lineHeight: 21, color: '#2f3d2c' },
  pledgeBtn: {
    marginTop: 8,
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#e7f2e7',
    borderWidth: 1,
    borderColor: '#bcd9bd',
  },
  pledgeBtnText: { fontSize: 14, fontWeight: '600', color: '#296f46' },
  law: { marginTop: 16, fontSize: 12, color: '#566658', fontStyle: 'italic' },
  depthBlock: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#d4e0d2',
  },
  depthLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    color: '#4a5c4d',
    textTransform: 'uppercase',
  },
  depthRow: { flexDirection: 'row', marginTop: 8, gap: 8 },
  depthPill: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  depthUnlocked: { backgroundColor: '#3a7d44' },
  depthLocked: { backgroundColor: '#e2ebe0' },
  depthNum: { fontSize: 15, fontWeight: '700', color: '#566658' },
  depthNumUnlocked: { color: '#fff' },
  depthHint: { marginTop: 8, fontSize: 12, color: '#566658', fontStyle: 'italic' },
  ctaWrap: { margin: 20 },
  cta: { paddingVertical: 16, borderRadius: 14, backgroundColor: '#3a7d44', alignItems: 'center' },
  ctaText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  nearbyNote: { marginTop: 8, fontSize: 12, color: '#566658', textAlign: 'center' },
});
