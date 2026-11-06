import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { soundCredit, type SoundSource, type SpeciesSound } from '../lib/birdSound';
import { createTranslator, type Locale } from '../lib/i18n';

// "Hear its song" (T-246): the bird's shortened recording (T-245), with its credit underneath.
// Nothing renders until a recording is known to exist, so a bird without one (or offline) shows
// no button at all rather than one that fails. Without the Full Game the button is shown
// disabled with a note that it is part of the Full Game (T-250), and no player is created.

export default function BirdSong({
  speciesId,
  locale,
  source,
  locked = false,
}: {
  speciesId: string;
  locale: Locale;
  source: SoundSource;
  /** True without the Full Game (T-250): shown, but cannot be played. */
  locked?: boolean;
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
  if (!sound) return null;
  if (locked)
    return <LockedSong locale={locale} label={`🔒 ${createTranslator(locale)('card.song')}`} />;
  return <SongPlayer key={sound.url} sound={sound} locale={locale} />;
}

/** A disabled song button with the Full Game note under it (T-250). Not a store link. */
export function LockedSong({ locale, label }: { locale: Locale; label: string }) {
  const tr = createTranslator(locale);
  return (
    <View style={styles.wrap}>
      <Pressable
        disabled
        accessibilityRole="button"
        accessibilityState={{ disabled: true }}
        accessibilityHint={tr('song.fullGameOnly')}
        style={[styles.button, styles.buttonLocked]}
      >
        <Text style={[styles.buttonText, styles.buttonTextLocked]}>{label}</Text>
      </Pressable>
      <Text style={styles.credit}>{tr('song.fullGameOnly')}</Text>
    </View>
  );
}

/** The play button + credit. In the song quiz the credit is not a link: the page names the bird. */
export function SongPlayer({
  sound,
  locale,
  linkCredit = true,
}: {
  sound: SpeciesSound;
  locale: Locale;
  linkCredit?: boolean;
}) {
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
        accessibilityRole={linkCredit ? 'link' : 'text'}
        onPress={
          linkCredit
            ? () => void Linking.openURL(sound.sourceUrl).catch(() => undefined)
            : undefined
        }
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
  buttonLocked: { backgroundColor: '#eceeea' },
  buttonTextLocked: { color: '#8a948b' },
  buttonText: { fontSize: 15, fontWeight: '600', color: '#2f5d34' },
  credit: { marginTop: 4, fontSize: 11, color: '#6b7d6e', textAlign: 'center' },
});
