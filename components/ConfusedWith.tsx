import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { createTranslator, type Locale } from '../lib/i18n';
import type { ContentLocale } from '../lib/i18n/contentLocale';
import { writingDirectionFor } from '../lib/i18n/bidi';
import { commonNameFor, commonNameInLocale } from '../lib/species/localized';
import { photoFor } from '../lib/species/media';
import type { Species } from '../lib/species/types';

// "Often confused with" on the card (T-352 · review F-13): `confusedWith` picks the species; each
// opens its own card. Credits are on each species' own card, as in the Almanac grid (T-126).

export default function ConfusedWith({
  locale,
  species,
  onOpen,
  secondaryLocale = null,
  secondaryNames = {},
}: {
  locale: Locale;
  species: Species[];
  onOpen: (species: Species) => void;
  /** Dual display's second language (T-387); null when it is off. */
  secondaryLocale?: ContentLocale | null;
  /** Names in that language by species id, read by the caller (useSecondaryNames). */
  secondaryNames?: Record<string, string>;
}) {
  const tr = createTranslator(locale);
  if (species.length === 0) return null;
  return (
    <View style={styles.block}>
      <Text style={styles.title}>{tr('card.confusedWith')}</Text>
      <View style={styles.row}>
        {species.map((s) => {
          const name = commonNameFor(s, locale as ContentLocale);
          const raw = secondaryLocale ? (secondaryNames[s.id] ?? commonNameInLocale(s, secondaryLocale)) : undefined;
          const second = raw && raw !== name ? raw : undefined;
          return (
            <Pressable
              key={s.id}
              style={styles.item}
              onPress={() => onOpen(s)}
              accessibilityRole="button"
              accessibilityLabel={second ? `${name}, ${second}` : name}
            >
              <Thumb species={s} />
              <Text style={styles.name} numberOfLines={2}>
                {name}
              </Text>
              {second && secondaryLocale ? (
                <Text style={[styles.second, { writingDirection: writingDirectionFor(secondaryLocale) }]} numberOfLines={2}>
                  {second}
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function Thumb({ species }: { species: Species }) {
  const [failed, setFailed] = useState(false);
  const photo = photoFor(species);
  if (!photo || failed) return <View style={[styles.photo, styles.placeholder]} />;
  return <Image source={{ uri: photo.url }} style={styles.photo} resizeMode="cover" onError={() => setFailed(true)} />;
}

const styles = StyleSheet.create({
  block: { marginTop: 20 },
  title: { fontSize: 16, fontWeight: '700', color: '#2f5d34', marginBottom: 8 },
  row: { flexDirection: 'row', gap: 10 },
  item: { flex: 1, maxWidth: '33%', alignItems: 'center' },
  photo: { width: '100%', aspectRatio: 1, borderRadius: 10 },
  placeholder: { backgroundColor: '#e2ebe0' },
  name: { marginTop: 4, fontSize: 13, color: '#22331f', textAlign: 'center' },
  second: { marginTop: 1, fontSize: 12, color: '#566658', textAlign: 'center' },
});
