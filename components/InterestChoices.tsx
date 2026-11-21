import { Pressable, StyleSheet, Text, View } from 'react-native';
import { createTranslator, type Locale, type TranslationKey } from '../lib/i18n';
import { toggleInterest, type Interests } from '../lib/interests';
import { PREF_GROUPS } from '../lib/notifPrefs';

// Settings → "Show me" (T-390): which kinds of species the app shows and notifies about. One
// choice for This Week, the calendar and notifications; the Almanac keeps everything collected.

export default function InterestChoices({
  locale,
  interests,
  onChange,
}: {
  locale: Locale;
  interests: Interests;
  onChange: (next: Interests) => void;
}) {
  const tr = createTranslator(locale);
  const on = interests ?? [...PREF_GROUPS];
  return (
    <View style={styles.card} testID="interest-choices">
      <View style={styles.row}>
        {PREF_GROUPS.map((g) => {
          const selected = on.includes(g);
          return (
            <Pressable
              key={g}
              onPress={() => onChange(toggleInterest(interests, g))}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              style={[styles.chip, selected && styles.chipOn]}
            >
              <Text style={[styles.chipText, selected && styles.chipTextOn]}>
                {tr(`notif.group.${g}` as TranslationKey)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginTop: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, borderWidth: 1, borderColor: '#cdd8ca' },
  chipOn: { backgroundColor: '#3a7d44', borderColor: '#3a7d44' },
  chipText: { fontSize: 13, color: '#336f3c' },
  chipTextOn: { color: '#fff' },
});
