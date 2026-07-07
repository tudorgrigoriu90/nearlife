import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { HelpKind } from '../../lib/collection';
import { createTranslator, type Locale } from '../../lib/i18n';
import { commonNameFor, contentFor } from '../../lib/species/localized';
import type { Species } from '../../lib/species/types';

// Helped-tier pledge confirmation (T-076 · GDD §5, USER-FLOWS §7). The Helped tier is a light,
// one-tap, honor-system act — no proof required. This confirmation is a delight moment and stays
// clean: the action pledged, the standing follow-local-law line, and thanks — NO upsell, no ads
// (invariant #4). The mission is never gated (invariant #2).

export default function PledgeConfirm({
  species,
  kind,
  locale = 'en',
  onDone,
}: {
  species: Species;
  kind: HelpKind;
  locale?: Locale;
  onDone: () => void;
}) {
  const tr = createTranslator(locale);
  const name = commonNameFor(species, locale);
  const content = contentFor(species.id, locale);
  const action = kind === 'give' ? content?.give : content?.protect;

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.emoji}>🌱</Text>
        <Text style={styles.title}>{tr('pledge.title', { name })}</Text>
        {action ? <Text style={styles.action}>{action}</Text> : null}
        <Text style={styles.law}>⚖ {tr('card.followLaw')}</Text>
        <Text style={styles.thanks}>{tr('pledge.thanks')}</Text>
      </View>
      <Pressable style={styles.cta} onPress={onDone} accessibilityRole="button">
        <Text style={styles.ctaText}>{tr('pledge.done')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f8f2', paddingHorizontal: 28, paddingTop: 96, paddingBottom: 40 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 64, marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '800', color: '#2f7d4f', textAlign: 'center' },
  action: { marginTop: 16, fontSize: 16, lineHeight: 23, color: '#2f3d2c', textAlign: 'center' },
  law: { marginTop: 16, fontSize: 12, color: '#7a8a7c', fontStyle: 'italic', textAlign: 'center' },
  thanks: { marginTop: 20, fontSize: 15, color: '#4a5c4d', textAlign: 'center' },
  cta: { paddingVertical: 16, borderRadius: 14, backgroundColor: '#3a7d44', alignItems: 'center' },
  ctaText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
