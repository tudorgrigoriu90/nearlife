import { useRef, useState } from 'react';
import { Image, Modal, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import { createTranslator, type Locale } from '../lib/i18n';
import { shareCardLines } from '../lib/shareCard';
import { buildShareMessage } from '../lib/shareSpecies';
import { groupOf } from '../lib/species/group';
import { photoFor } from '../lib/species/media';
import type { Species } from '../lib/species/types';
import { speciesGlyph } from './speciesVisual';

// Share a species as an image (T-368 · review F-14): a small card (photo, name, "active in
// {county} this season", the photo credit, the app) is drawn on the phone (react-native-view-shot)
// and handed to the system share sheet (expo-sharing). "Share as text" keeps the old message.
// A delight moment: no upsell (invariant #4). No link: a nearby:// link is not clickable in
// messengers, and opening a card from one waits for deep-link routing (T-361, v2).

export default function ShareSheet({
  species,
  locale,
  county,
  visible,
  onClose,
}: {
  species: Species;
  locale: Locale;
  county: string | null;
  visible: boolean;
  onClose: () => void;
}) {
  const tr = createTranslator(locale);
  const lines = shareCardLines(species, locale, county);
  const photo = photoFor(species);
  const cardRef = useRef<View>(null);
  const [busy, setBusy] = useState(false);

  const shareText = () => void Share.share({ message: buildShareMessage(lines.name, locale) }).catch(() => undefined);

  const shareImage = async () => {
    setBusy(true);
    try {
      if (!(await Sharing.isAvailableAsync())) {
        shareText();
        return;
      }
      const uri = await captureRef(cardRef, { format: 'png', quality: 0.92, result: 'tmpfile' });
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: tr('share.title', { name: lines.name }) });
    } catch {
      // Dismissed or failed: nothing to undo.
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{tr('share.title', { name: lines.name })}</Text>
          {/* collapsable={false}: Android must keep this view to capture it. */}
          <View ref={cardRef} collapsable={false} style={styles.card} testID="share-card">
            {photo ? (
              <Image source={{ uri: photo.url }} style={styles.photo} resizeMode="cover" />
            ) : (
              <Text style={styles.glyph}>{speciesGlyph(groupOf(species), true)}</Text>
            )}
            <Text style={styles.name}>{lines.name}</Text>
            <Text style={styles.season}>{lines.season}</Text>
            {lines.credit ? <Text style={styles.credit}>{lines.credit}</Text> : null}
            <Text style={styles.app}>{lines.app}</Text>
          </View>
          <Pressable style={styles.primary} onPress={() => void shareImage()} disabled={busy} accessibilityRole="button">
            <Text style={styles.primaryText}>{tr('share.image')}</Text>
          </Pressable>
          <Pressable style={styles.secondary} onPress={shareText} accessibilityRole="button">
            <Text style={styles.secondaryText}>{tr('share.text')}</Text>
          </Pressable>
          <Pressable onPress={onClose} accessibilityRole="button" style={styles.close}>
            <Text style={styles.secondaryText}>{tr('delete.cancel')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#f4f8f2', borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 16, paddingBottom: 28 },
  title: { fontSize: 18, fontWeight: '700', color: '#2f5d34', marginBottom: 12 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 12, alignItems: 'center' },
  photo: { width: '100%', aspectRatio: 4 / 3, borderRadius: 10 },
  glyph: { fontSize: 72, marginVertical: 16 },
  name: { marginTop: 10, fontSize: 22, fontWeight: '700', color: '#22331f', textAlign: 'center' },
  season: { marginTop: 4, fontSize: 15, color: '#336f3c', textAlign: 'center' },
  credit: { marginTop: 8, fontSize: 11, color: '#566658', textAlign: 'center' },
  app: { marginTop: 8, fontSize: 13, fontWeight: '700', color: '#2f5d34' },
  primary: { marginTop: 14, backgroundColor: '#3a7d44', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  primaryText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  secondary: { marginTop: 8, backgroundColor: '#eaf4ea', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  secondaryText: { fontSize: 15, fontWeight: '600', color: '#296f46' },
  close: { marginTop: 10, alignItems: 'center', paddingVertical: 8 },
});
