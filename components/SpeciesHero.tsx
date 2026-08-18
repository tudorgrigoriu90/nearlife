import { useState } from 'react';
import { Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { attributionFor, KRONOBERG_MEDIA, primaryPhoto } from '../lib/species/media';
import type { Species } from '../lib/species/types';
import { speciesGlyph } from './speciesVisual';

// Species card hero (T-126, thumbnail tier T-168). Shows the license-clear photo once the species
// is spotted — keeping the pre-spot silhouette so discovery still means something. Falls back to
// the category glyph if there's no photo or the image fails to load, so the hero is never broken.
// Attribution (author + license) is shown whenever a photo is displayed — required for CC-BY /
// CC-BY-SA (invariant #8).
//
// What ships is a ~40 KB thumbnail; tapping opens the Wikimedia Commons file page for the full
// resolution. That is a storage decision as much as a UX one — re-hosting full-size photos for
// every Nordic species would exhaust the 1 GB free tier — and it has the happy property that the
// "bigger photo" destination is also the page carrying the licence and author, which is what the
// attribution terms actually ask for.
export default function SpeciesHero({ species, spotted }: { species: Species; spotted: boolean }) {
  const [failed, setFailed] = useState(false);
  const photo = spotted ? primaryPhoto(KRONOBERG_MEDIA, species.id) : null;

  if (photo && !failed) {
    return (
      <View style={styles.wrap}>
        <Pressable
          testID="species-photo"
          onPress={() => {
            // Never let a dead link crash a delight moment; the card still stands without it.
            void Linking.openURL(photo.sourceUrl).catch(() => undefined);
          }}
          accessibilityRole="imagebutton"
          accessibilityLabel={species.commonName}
          accessibilityHint="Opens the full-size photo and its licence on Wikimedia Commons"
        >
          <Image
            source={{ uri: photo.url }}
            style={styles.photo}
            resizeMode="cover"
            onError={() => setFailed(true)}
          />
        </Pressable>
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
