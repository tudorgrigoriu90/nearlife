import { Pressable, StyleSheet, Text, View } from 'react-native';
import { createTranslator, type Locale } from '../lib/i18n';
import type { OfflinePack, PackProgress } from '../lib/offlinePack';

// Settings → Offline (T-256). With the Full Game: save the county, see what is saved, update or
// remove it. Without: the same row, disabled, saying it is part of the Full Game (as bird song,
// T-250), with no store link.

export function formatMegabytes(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return mb < 10 ? mb.toFixed(1) : String(Math.round(mb));
}

export default function OfflineSection({
  locale,
  fullGame,
  pack,
  sizeBytes,
  progress,
  failed,
  onDownload,
  onRemove,
}: {
  locale: Locale;
  fullGame: boolean;
  pack: OfflinePack | null;
  sizeBytes: number;
  progress: PackProgress | null;
  failed: boolean;
  onDownload: () => void;
  onRemove: () => void;
}) {
  const tr = createTranslator(locale);
  const label = tr('offline.save');

  if (!fullGame) {
    return (
      <View style={styles.card}>
        <Pressable disabled accessibilityRole="button" accessibilityState={{ disabled: true }} style={styles.row}>
          <Text style={[styles.rowLabel, styles.locked]}>🔒 {label}</Text>
        </Pressable>
        <Text style={styles.note}>{tr('song.fullGameOnly')}</Text>
      </View>
    );
  }

  if (progress) {
    return (
      <View style={styles.card}>
        <Text style={styles.status} accessibilityLiveRegion="polite">
          {progress.step === 'text'
            ? tr('offline.savingText')
            : tr('offline.savingPhotos', { done: progress.done, total: progress.total })}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      {pack ? (
        <>
          <Text style={styles.status}>
            {tr('offline.saved', {
              date: pack.savedAt.slice(0, 10),
              count: pack.catalogue.length,
              mb: formatMegabytes(sizeBytes),
            })}
          </Text>
          <Text style={styles.note}>{tr('offline.autoNote')}</Text>
          <Pressable style={[styles.row, styles.rowBorder]} onPress={onDownload} accessibilityRole="button">
            <Text style={styles.rowLabel}>{tr('offline.update')}</Text>
          </Pressable>
          <Pressable style={[styles.row, styles.rowBorder]} onPress={onRemove} accessibilityRole="button">
            <Text style={[styles.rowLabel, styles.danger]}>{tr('offline.remove')}</Text>
          </Pressable>
        </>
      ) : (
        <>
          <Pressable style={styles.row} onPress={onDownload} accessibilityRole="button">
            <Text style={styles.rowLabel}>⬇️ {label}</Text>
          </Pressable>
          <Text style={styles.note}>{tr('offline.saveHint')}</Text>
        </>
      )}
      {failed ? <Text style={styles.failed}>{tr('offline.failed')}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 16, paddingBottom: 12 },
  row: { paddingVertical: 14 },
  rowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#e2ebe0' },
  rowLabel: { fontSize: 16, color: '#22331f' },
  locked: { color: '#8a948b' },
  status: { paddingTop: 14, fontSize: 15, fontWeight: '600', color: '#2f5d34' },
  note: { fontSize: 12, lineHeight: 17, color: '#7a8a7c' },
  failed: { marginTop: 8, fontSize: 13, color: '#8a4b1f', fontWeight: '600' },
  danger: { color: '#b3261e' },
});
