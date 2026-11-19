import { Pressable, StyleSheet, Text, View } from 'react-native';
import { createTranslator, type Locale, type TranslationKey } from '../lib/i18n';
import {
  FREQUENCIES,
  PREF_GROUPS,
  SEND_WINDOWS,
  toggleGroup,
  type NotifPrefs,
} from '../lib/notifPrefs';

// Notification choices in Settings (T-342 · review F-03): how often, at what time of day, about
// which groups. Shown only while notifications are on; the consent switch above stays the master.

export default function NotifChoices({
  locale,
  prefs,
  onChange,
}: {
  locale: Locale;
  prefs: NotifPrefs;
  onChange: (next: NotifPrefs) => void;
}) {
  const tr = createTranslator(locale);
  const groupsOn = prefs.groups ?? [...PREF_GROUPS];
  return (
    <View style={styles.card} testID="notif-choices">
      <Text style={styles.label}>{tr('notif.frequency')}</Text>
      <View style={styles.row}>
        {FREQUENCIES.map((f) => (
          <Choice
            key={f}
            label={tr(`notif.frequency.${f}` as TranslationKey)}
            selected={prefs.frequency === f}
            onPress={() => onChange({ ...prefs, frequency: f })}
          />
        ))}
      </View>
      <Text style={styles.label}>{tr('notif.window')}</Text>
      <View style={styles.row}>
        <Choice label={tr('notif.window.any')} selected={prefs.window === null} onPress={() => onChange({ ...prefs, window: null })} />
        {SEND_WINDOWS.map((w) => (
          <Choice
            key={w}
            label={tr(`notif.window.${w}` as TranslationKey)}
            selected={prefs.window === w}
            onPress={() => onChange({ ...prefs, window: w })}
          />
        ))}
      </View>
      <Text style={styles.label}>{tr('notif.groups')}</Text>
      <View style={styles.row}>
        {PREF_GROUPS.map((g) => (
          <Choice
            key={g}
            label={tr(`notif.group.${g}` as TranslationKey)}
            selected={groupsOn.includes(g)}
            onPress={() => onChange(toggleGroup(prefs, g))}
          />
        ))}
      </View>
      <Text style={styles.hint}>{tr('notif.hint')}</Text>
    </View>
  );
}

function Choice({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[styles.chip, selected && styles.chipOn]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextOn]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, gap: 8, marginTop: 8 },
  label: { fontSize: 14, fontWeight: '700', color: '#22331f', marginTop: 4 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, borderWidth: 1, borderColor: '#cdd8ca' },
  chipOn: { backgroundColor: '#3a7d44', borderColor: '#3a7d44' },
  chipText: { fontSize: 13, color: '#336f3c' },
  chipTextOn: { color: '#fff' },
  hint: { fontSize: 12, lineHeight: 18, color: '#566658', marginTop: 4 },
});
