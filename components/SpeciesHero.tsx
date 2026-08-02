import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { attributionFor, KRONOBERG_MEDIA, primaryPhoto } from '../lib/species/media';
import type { Species } from '../lib/species/types';
import { speciesGlyph } from './speciesVisual';

// Species card hero (T-126). Shows the real license-clear photo (re-hosted on Supabase Storage,
// T-119) once the species is spotted — keeping the pre-spot silhouette so discovery still means
// something. Falls back to the category glyph if there's no photo or the image fails to load (e.g.
// before the Storage upload runs), so the hero is never broken. Attribution (author + license) is
// shown whenever a photo is displayed — required for CC-BY / CC-BY-SA (invariant #8).
export default function SpeciesHero({ species, spotted }: { species: Species; spotted: boolean }) {
  const [failed, setFailed] = useState(false);
  const photo = spotted ? primaryPhoto(KRONOBERG_MEDIA, species.id) : null;

  if (photo && !failed) {
    return (
      <View style={styles.wrap}>
        <Image
          source={{ uri: photo.url }}
          style={styles.photo}
          resizeMode="cover"
          onError={() => setFailed(true)}
          accessibilityLabel={species.commonName}
        />
        <Text style={styles.credit}>{attributionFor(photo)}</Text>
      </View>
    );
  }
  return <Text style={styles.emoji}>{speciesGlyph(species.category, spotted)}</Text>;
}

const styles = StyleSheet.create({
  wrap: { width: '100%', alignItems: 'center' },
  photo: { width: '100%', height: 220, borderRadius: 16, backgroundColor: '#e2ebe0' },
  credit: { marginTop: 6, fontSize: 11, color: '#7a8a7c', textAlign: 'center' },
  emoji: { fontSize: 72 },
});
