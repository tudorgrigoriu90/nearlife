import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { createTranslator, type Locale } from '../lib/i18n';

// Data export view (T-092 · PRIVACY §2, GDPR right to access). Shows the user's full data bundle
// (built by lib/dataExport) as selectable JSON they can copy. A file/share export is a later
// enhancement; a readable, copyable dump satisfies "export your data, reachable anytime".

export default function DataExportView({
  json,
  locale = 'en',
  onDone,
}: {
  json: string;
  locale?: Locale;
  onDone: () => void;
}) {
  const tr = createTranslator(locale);
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{tr('export.title')}</Text>
        <Pressable onPress={onDone} accessibilityRole="button">
          <Text style={styles.done}>{tr('settings.done')}</Text>
        </Pressable>
      </View>
      <Text style={styles.hint}>{tr('export.hint')}</Text>
      <ScrollView style={styles.jsonWrap} contentContainerStyle={styles.jsonContent}>
        <Text style={styles.json} selectable>
          {json}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f8f2', paddingTop: 56, paddingHorizontal: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 24, fontWeight: '700', color: '#2f5d34' },
  done: { fontSize: 16, fontWeight: '600', color: '#3a7d44' },
  hint: { marginTop: 6, marginBottom: 12, fontSize: 13, color: '#7a8a7c' },
  jsonWrap: { flex: 1, backgroundColor: '#0e1f14', borderRadius: 12, marginBottom: 24 },
  jsonContent: { padding: 14 },
  json: { fontSize: 12, color: '#cfe6d1', fontFamily: 'monospace', lineHeight: 17 },
});
