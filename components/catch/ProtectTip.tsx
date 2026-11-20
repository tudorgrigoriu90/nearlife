import { Pressable, StyleSheet, Text, View } from 'react-native';
import { createTranslator, type Locale } from '../../lib/i18n';
import { withIndefiniteArticle } from '../../lib/i18n/article';
import { commonNameFor, contentFor } from '../../lib/species/localized';
import type { SpeciesContent } from '../../lib/species/content';
import type { Species } from '../../lib/species/types';

// Catch-success "killer moment" (T-034 → T-074): the contextual protect tip shown right after a
// successful catch. This is a delight moment — it stays clean: the protect action + the standing
// follow-local-law line, and NO upsell or ads (invariant #4). The free-catch counter and paywall
// live on the catch *entry*, never here.

export default function ProtectTip({
  species,
  locale = 'en',
  prime = false,
  content: loaded,
  onDone,
}: {
  species: Species;
  locale?: Locale;
  /** Caught inside its active season (lib/primeBonus): a quiet extra line, never a reward to buy. */
  prime?: boolean;
  /**
   * The content the card loaded for this species (T-273 · review B-10). Catalogue species have no
   * bundled content, so without it the screen had no tip; the bundled set is the fallback.
   */
  content?: SpeciesContent | null;
  onDone: () => void;
}) {
  const tr = createTranslator(locale);
  const name = commonNameFor(species, locale);
  const content = loaded ?? contentFor(species.id, locale);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* English takes "a"/"an" (T-371); the Swedish wording needs no article. */}
        <Text style={styles.badge}>
          🎣 {tr('catch.caught', { name: locale === 'en' ? withIndefiniteArticle(name) : name })}
        </Text>
        {prime ? <Text style={styles.prime}>✨ {tr('catch.prime')}</Text> : null}
        {content ? (
          <View style={styles.tipCard}>
            <Text style={styles.tipLabel}>{tr('card.protect')}</Text>
            <Text style={styles.tipBody}>{content.protect}</Text>
            <Text style={styles.law}>⚖ {tr('card.followLaw')}</Text>
          </View>
        ) : null}
      </View>
      <Pressable style={styles.cta} onPress={onDone} accessibilityRole="button">
        <Text style={styles.ctaText}>{tr('catch.continue')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f8f2',
    paddingHorizontal: 24,
    paddingTop: 96,
    paddingBottom: 40,
  },
  content: { flex: 1, justifyContent: 'center' },
  badge: {
    fontSize: 22,
    fontWeight: '800',
    color: '#296f46',
    textAlign: 'center',
    marginBottom: 24,
  },
  prime: {
    marginTop: -16,
    marginBottom: 24,
    fontSize: 15,
    fontWeight: '600',
    color: '#7a5a1f',
    textAlign: 'center',
  },
  tipCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20 },
  tipLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    color: '#2f5d8a',
    textTransform: 'uppercase',
  },
  tipBody: { marginTop: 8, fontSize: 16, lineHeight: 23, color: '#2f3d2c' },
  law: { marginTop: 16, fontSize: 12, color: '#566658', fontStyle: 'italic' },
  cta: { paddingVertical: 16, borderRadius: 14, backgroundColor: '#3a7d44', alignItems: 'center' },
  ctaText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
