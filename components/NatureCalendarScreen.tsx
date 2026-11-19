import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { createTranslator, type Locale } from '../lib/i18n';
import type { ContentLocale } from '../lib/i18n/contentLocale';
import { natureCalendar } from '../lib/natureCalendar';
import { commonNameFor } from '../lib/species/localized';
import type { Month, Species } from '../lib/species/types';

// The county's nature calendar (T-353 · review F-12): twelve months from this one, each with the
// species most recorded then. The subtitle says these are records, not a forecast (invariant #1).

export default function NatureCalendarScreen({
  locale,
  county,
  species,
  month,
  onOpenSpecies,
  onDone,
}: {
  locale: Locale;
  county: string | null;
  species: Species[];
  /** This month: the calendar starts here. */
  month: Month;
  onOpenSpecies: (species: Species) => void;
  onDone: () => void;
}) {
  const tr = createTranslator(locale);
  const names = tr('county.months').split('|');
  const calendar = natureCalendar(species);
  const ordered = [...calendar.slice(month - 1), ...calendar.slice(0, month - 1)];
  const empty = calendar.every((m) => m.species.length === 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{tr('calendar.title')} 📅</Text>
        <Pressable onPress={onDone} accessibilityRole="button">
          <Text style={styles.done}>{tr('settings.done')}</Text>
        </Pressable>
      </View>
      {county ? <Text style={styles.subtitle}>{tr('calendar.subtitle', { county })}</Text> : null}
      {empty ? (
        <Text style={styles.none}>{tr('calendar.empty')}</Text>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {ordered.map((m) => (
            <View key={m.month} style={styles.month}>
              <Text style={styles.monthName} accessibilityRole="header">
                {names[m.month - 1]}
              </Text>
              {m.species.length === 0 ? (
                <Text style={styles.none}>{tr('calendar.none')}</Text>
              ) : (
                m.species.map((s, i) => (
                  <Pressable key={s.id} onPress={() => onOpenSpecies(s)} accessibilityRole="button">
                    <Text style={styles.species}>
                      <Text style={styles.rank}>{i + 1}. </Text>
                      {commonNameFor(s, locale as ContentLocale)}
                    </Text>
                  </Pressable>
                ))
              )}
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f8f2', paddingTop: 64, paddingHorizontal: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '700', color: '#2f5d34' },
  done: { fontSize: 16, fontWeight: '600', color: '#336f3c' },
  subtitle: { marginTop: 4, marginBottom: 8, fontSize: 14, color: '#4a5c4d' },
  list: { paddingBottom: 32 },
  month: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginTop: 10 },
  monthName: { fontSize: 17, fontWeight: '700', color: '#2f5d34', marginBottom: 4, textTransform: 'capitalize' },
  species: { fontSize: 15, color: '#22331f', paddingVertical: 4 },
  rank: { color: '#4a5c4d' },
  none: { fontSize: 14, color: '#4a5c4d', marginTop: 8 },
});
