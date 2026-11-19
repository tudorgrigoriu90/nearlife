import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { createTranslator, type Locale } from '../lib/i18n';
import type { ContentLocale } from '../lib/i18n/contentLocale';
import { todaysQueue, trainerNames, type TrainerState } from '../lib/nameTrainer';
import { groupOf } from '../lib/species/group';
import { photoFor } from '../lib/species/media';
import type { Species } from '../lib/species/types';
import { speciesGlyph } from './speciesVisual';

// "Learn the names" (T-351 · review F-06): up to ten cards a day from the species the user has
// spotted. The photo comes first; "Show the names" turns the card to the Swedish name and the
// name in the other language. "Still learning" brings the card back after 1, 3, then 7 days.
// No upsell here: learning a name is a delight moment (invariant #4).

type Card = { species: Species; sv: string; other: string };

export default function NameTrainerScreen({
  locale,
  spotted,
  state,
  other,
  today,
  onAnswer,
  onDone,
}: {
  locale: Locale;
  /** The species the user has spotted, oldest first. */
  spotted: Species[];
  state: TrainerState;
  /** The language beside Swedish (`trainerLocale`). */
  other: ContentLocale;
  /** YYYY-MM-DD. */
  today: string;
  onAnswer: (speciesId: string, result: 'knew' | 'learning', today: string) => void;
  onDone: () => void;
}) {
  const tr = createTranslator(locale);
  // Today's deck is fixed when the screen opens, so an answer never reshuffles it.
  const [deck] = useState<Card[]>(() => {
    const cards = new Map<string, Card>();
    for (const s of spotted) {
      const names = trainerNames(s, other);
      if (names) cards.set(s.id, { species: s, ...names });
    }
    return todaysQueue([...cards.keys()], state, today).map((id) => cards.get(id) as Card);
  });
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const card = deck[index];

  const respond = (result: 'knew' | 'learning') => {
    onAnswer(card.species.id, result, today);
    setRevealed(false);
    setIndex((i) => i + 1);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{tr('trainer.title')}</Text>
        <Pressable onPress={onDone} accessibilityRole="button">
          <Text style={styles.done}>{tr('settings.done')}</Text>
        </Pressable>
      </View>
      {deck.length === 0 ? (
        <Text style={styles.message}>{tr('trainer.empty')}</Text>
      ) : card === undefined ? (
        <Text style={styles.message}>{tr('trainer.finished')}</Text>
      ) : (
        <View style={styles.card}>
          <Text style={styles.count}>{tr('trainer.count', { n: index + 1, total: deck.length })}</Text>
          <CardPhoto species={card.species} label={tr('trainer.photo')} />
          {revealed ? (
            <>
              <Text style={styles.sv} accessibilityLanguage="sv">
                {card.sv}
              </Text>
              <Text style={styles.other} accessibilityLanguage={other}>
                {card.other}
              </Text>
              <View style={styles.answers}>
                <Pressable style={styles.learning} onPress={() => respond('learning')} accessibilityRole="button">
                  <Text style={styles.learningText}>{tr('trainer.learning')}</Text>
                </Pressable>
                <Pressable style={styles.knew} onPress={() => respond('knew')} accessibilityRole="button">
                  <Text style={styles.knewText}>{tr('trainer.knew')}</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <Pressable style={styles.reveal} onPress={() => setRevealed(true)} accessibilityRole="button">
              <Text style={styles.knewText}>{tr('trainer.reveal')}</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

function CardPhoto({ species, label }: { species: Species; label: string }) {
  const [failed, setFailed] = useState(false);
  const photo = photoFor(species);
  if (photo && !failed) {
    return (
      <Image
        source={{ uri: photo.url }}
        style={styles.photo}
        resizeMode="cover"
        accessibilityLabel={label}
        onError={() => setFailed(true)}
      />
    );
  }
  return <Text style={styles.glyph}>{speciesGlyph(groupOf(species), true)}</Text>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f8f2', paddingTop: 64, paddingHorizontal: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 24, fontWeight: '700', color: '#2f5d34' },
  done: { fontSize: 16, fontWeight: '600', color: '#336f3c' },
  message: { marginTop: 24, fontSize: 16, color: '#4a5c4d', textAlign: 'center' },
  card: { alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 16 },
  count: { alignSelf: 'flex-end', fontSize: 13, color: '#4a5c4d' },
  photo: { width: '100%', aspectRatio: 4 / 3, borderRadius: 10, marginVertical: 12 },
  glyph: { fontSize: 72, marginVertical: 24 },
  sv: { fontSize: 26, fontWeight: '700', color: '#22331f', textAlign: 'center' },
  other: { marginTop: 4, fontSize: 18, color: '#4a5c4d', textAlign: 'center' },
  answers: { flexDirection: 'row', gap: 10, marginTop: 16, alignSelf: 'stretch' },
  reveal: { marginTop: 8, alignSelf: 'stretch', backgroundColor: '#3a7d44', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  knew: { flex: 1, backgroundColor: '#3a7d44', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  knewText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  learning: { flex: 1, backgroundColor: '#eaf4ea', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  learningText: { fontSize: 16, fontWeight: '700', color: '#296f46' },
});
