import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { soundCredit, type SoundSource, type SpeciesSound } from '../lib/birdSound';
import { createTranslator, type Locale } from '../lib/i18n';

// "Hear its song" (T-246): the bird's shortened recording (T-245), with its credit underneath.
// Nothing renders until a recording is known to exist, so a bird without one (or offline) shows
// no button at all rather than one that fails.

export default function BirdSong({
  speciesId,
  locale,
  source,
}: {
  speciesId: string;
  locale: Locale;
  source: SoundSource;
}) {
  // Keyed by species, so a card reused for another bird never plays the previous one's song.
  const [found, setFound] = useState<{ speciesId: string; sound?: SpeciesSound } | null>(null);

  useEffect(() => {
    let cancelled = false;
    void source.soundFor(speciesId).then((sound) => {
      if (!cancelled) setFound({ speciesId, sound });
    });
    return () => {
      cancelled = true;
    };
  }, [source, speciesId]);

  const sound = found?.speciesId === speciesId ? found.sound : undefined;
  return sound ? <SongPlayer key={sound.url} sound={sound} locale={locale} /> : null;
}

function SongPlayer({ sound, locale }: { sound: SpeciesSound; locale: Locale }) {
  const tr = createTranslator(locale);
  // The player is released by the hook when the card closes, which also stops the song.
  const player = useAudioPlayer({ uri: sound.url });
  const status = useAudioPlayerStatus(player);

  const toggle = () => {
    if (status.playing) {
      player.pause();
      return;
    }
    // A finished clip sits at its end: rewind so a second tap plays it again.
    if (status.didJustFinish) void player.seekTo(0);
    player.play();
  };

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={toggle}
        accessibilityRole="button"
        accessibilityState={{ selected: status.playing }}
        style={[styles.button, status.playing && styles.buttonOn]}
      >
        <Text style={styles.buttonText}>
          {status.playing ? `⏹ ${tr('card.listenStop')}` : `🐦 ${tr('card.song')}`}
        </Text>
      </Pressable>
      <Text
        style={styles.credit}
        accessibilityRole="link"
        onPress={() => void Linking.openURL(sound.sourceUrl).catch(() => undefined)}
      >
        {soundCredit(sound, tr)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 10, alignItems: 'center' },
  button: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#e5f0e2',
  },
  buttonOn: { backgroundColor: '#cfe5cf' },
  buttonText: { fontSize: 15, fontWeight: '600', color: '#2f5d34' },
  credit: { marginTop: 4, fontSize: 11, color: '#6b7d6e', textAlign: 'center' },
});
