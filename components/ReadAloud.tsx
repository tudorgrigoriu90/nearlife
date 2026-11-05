import * as Speech from 'expo-speech';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { createTranslator, type Locale } from '../lib/i18n';
import { endonymOf, type ContentLocale } from '../lib/i18n/contentLocale';
import { cardSpeech, hasVoiceFor, speechLanguage } from '../lib/readAloud';
import type { SpeciesContent } from '../lib/species/content';

// Read aloud (T-244): the phone's own voice reads the card, in the app language and, when the
// phone has a voice for it, in the second language too. Speech stops when the card closes.

type Which = 'primary' | 'secondary';

export default function ReadAloud({
  locale,
  name,
  content,
  secondary = null,
}: {
  locale: Locale;
  name: string;
  content: SpeciesContent | null;
  secondary?: { locale: ContentLocale; name: string; content: SpeciesContent | null } | null;
}) {
  const tr = createTranslator(locale);
  const [speaking, setSpeaking] = useState<Which | null>(null);
  const [voices, setVoices] = useState<{ language: string }[]>([]);

  useEffect(() => {
    let cancelled = false;
    Speech.getAvailableVoicesAsync()
      .then((v) => {
        if (!cancelled) setVoices(v);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      void Speech.stop();
    };
  }, []);

  const toggle = (which: Which) => {
    void Speech.stop();
    if (speaking === which) {
      setSpeaking(null);
      return;
    }
    const lang = which === 'primary' ? locale : secondary!.locale;
    const text =
      which === 'primary'
        ? cardSpeech(name, content)
        : cardSpeech(secondary!.name, secondary!.content);
    const done = () => setSpeaking((current) => (current === which ? null : current));
    Speech.speak(text, {
      language: speechLanguage(lang),
      onDone: done,
      onStopped: done,
      onError: done,
    });
    setSpeaking(which);
  };

  // The app language is always offered: Swedish and English voices ship with Android. The second
  // language only when the phone can speak it, or it would be read in the wrong voice.
  const showSecondary = secondary !== null && hasVoiceFor(voices, secondary.locale);

  return (
    <View style={styles.row}>
      <Pressable onPress={() => toggle('primary')} accessibilityRole="button" style={styles.btn}>
        <Text style={styles.text}>
          {speaking === 'primary' ? `⏹ ${tr('card.listenStop')}` : `🔊 ${tr('card.listen')}`}
        </Text>
      </Pressable>
      {showSecondary ? (
        <Pressable
          onPress={() => toggle('secondary')}
          accessibilityRole="button"
          style={styles.btn}
        >
          <Text style={styles.text}>
            {speaking === 'secondary'
              ? `⏹ ${tr('card.listenStop')}`
              : `🔊 ${endonymOf(secondary!.locale)}`}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 10, marginTop: 10 },
  btn: { backgroundColor: '#eaf4ea', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8 },
  text: { fontSize: 14, fontWeight: '600', color: '#2f7d4f' },
});
