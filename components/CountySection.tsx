import { StyleSheet, Text, View } from 'react-native';
import type { CountyStats } from '../lib/countyStats';
import { createTranslator, type Locale, type TranslationKey } from '../lib/i18n';
import type { Month } from '../lib/species/types';

// The card's county section (T-262): when the species is recorded in the user's county, month by
// month, and where it stands there. Replaces the generic "active in your region" line wherever the
// county's records are known.

const CHART_HEIGHT = 44;

export function monthRange(months: Month[], names: string[]): string {
  const first = names[months[0] - 1];
  const last = names[months[months.length - 1] - 1];
  return months.length === 1 ? first : `${first}–${last}`;
}

export default function CountySection({
  locale,
  countyName,
  stats,
  month,
}: {
  locale: Locale;
  countyName: string;
  stats: CountyStats;
  /** This month, highlighted in the chart. */
  month: Month;
}) {
  const tr = createTranslator(locale);
  const names = tr('county.months').split('|');
  const initials = tr('county.initials').split('|');
  const { season, standing, monthCounts } = stats;
  const count = standing.occurrences.toLocaleString(locale === 'sv' ? 'sv-SE' : 'en-GB');

  const lines: string[] = [];
  if (season) {
    const peak = monthRange(season.peak, names);
    lines.push(
      season.kind === 'allYear'
        ? tr('county.allYear', { peak })
        : tr('county.season', { from: names[season.from - 1], to: names[season.to - 1], peak }),
    );
    if (season.visitor) lines.push(tr(`county.visitor.${season.visitor}` as TranslationKey));
    if (season.peak.includes(month)) lines.push(tr('county.now'));
  }
  if (standing.kind === 'rank') {
    lines.push(
      tr('county.rank', {
        rank: standing.rank,
        total: standing.total,
        group: tr(`county.group.${stats.group}` as TranslationKey),
        county: countyName,
        count,
      }),
    );
  } else if (standing.kind === 'uncommon') {
    lines.push(tr('county.uncommon', { count, county: countyName }));
  } else {
    lines.push(tr('county.records', { count, county: countyName }));
  }

  const max = monthCounts ? Math.max(...monthCounts) : 0;
  return (
    <View style={styles.section}>
      <Text style={styles.title}>{tr('county.title', { county: countyName })}</Text>
      {monthCounts && max > 0 ? (
        <View
          style={styles.chart}
          accessible
          accessibilityLabel={season ? lines[0] : undefined}
          testID="county-chart"
        >
          {monthCounts.map((c, i) => (
            <View key={i} style={styles.column}>
              <View style={styles.barTrack}>
                <View
                  testID={`county-bar-${i + 1}`}
                  style={[
                    styles.bar,
                    { height: c > 0 ? Math.max(2, (c / max) * CHART_HEIGHT) : 0 },
                    i + 1 === month && styles.barNow,
                  ]}
                />
              </View>
              <Text style={[styles.initial, i + 1 === month && styles.initialNow]}>
                {initials[i]}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
      {lines.map((line) => (
        <Text key={line} style={styles.line}>
          {line}
        </Text>
      ))}
      <Text style={styles.source}>{tr('county.source')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 20 },
  title: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
    color: '#4a5c4d',
    textTransform: 'uppercase',
  },
  chart: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 10, marginBottom: 6 },
  column: { flex: 1, alignItems: 'center' },
  barTrack: { height: CHART_HEIGHT, width: '70%', justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: 3, backgroundColor: '#a9c9a4' },
  barNow: { backgroundColor: '#2f7d4f' },
  initial: { marginTop: 3, fontSize: 10, color: '#7a8a7c' },
  initialNow: { color: '#2f5d34', fontWeight: '700' },
  line: { marginTop: 6, fontSize: 16, lineHeight: 23, color: '#22331f' },
  source: { marginTop: 8, fontSize: 11, lineHeight: 15, color: '#7a8a7c' },
});
