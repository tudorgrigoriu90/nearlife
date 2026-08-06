import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { createTranslator, type Locale } from '../../lib/i18n';

// Age-gate onboarding step (T-089 · GDPR-K, PRIVACY §3). Collects birth YEAR only (data
// minimization — never a full date of birth). The caller maps the year to an AgePath (lib/ageGate)
// and routes the restricted, minimal-data path for under-13s. General-audience, not a kids-category
// app: no one is blocked — the year only decides whether behavioural analytics can be offered.
// NOTE: on-device keyboard/layout not visually verified; the validation + submit are unit-tested.

const MAX_PLAUSIBLE_AGE = 120;

export default function AgeGateStep({
  locale = 'en',
  currentYear,
  onSubmit,
}: {
  locale?: Locale;
  /** Passed in (not read from the clock) so the step is deterministic and unit-testable. */
  currentYear: number;
  onSubmit: (birthYear: number) => void;
}) {
  const tr = createTranslator(locale);
  const [text, setText] = useState('');
  const year = Number.parseInt(text, 10);
  const valid =
    /^\d{4}$/.test(text) && year <= currentYear && year >= currentYear - MAX_PLAUSIBLE_AGE;

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🎂</Text>
      <Text style={styles.title}>{tr('onboarding.age.title')}</Text>
      <Text style={styles.body}>{tr('onboarding.age.body')}</Text>
      <TextInput
        style={styles.input}
        value={text}
        onChangeText={(t) => setText(t.replace(/[^0-9]/g, '').slice(0, 4))}
        keyboardType="number-pad"
        inputMode="numeric"
        placeholder={tr('onboarding.age.placeholder')}
        placeholderTextColor="#9fb0a0"
        accessibilityLabel={tr('onboarding.age.placeholder')}
        maxLength={4}
      />
      <Pressable
        style={[styles.cta, !valid && styles.ctaDisabled]}
        disabled={!valid}
        onPress={() => valid && onSubmit(year)}
        accessibilityRole="button"
        accessibilityState={{ disabled: !valid }}
      >
        <Text style={styles.ctaText}>{tr('onboarding.age.cta')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f8f2', paddingHorizontal: 28, justifyContent: 'center' },
  emoji: { fontSize: 56, textAlign: 'center' },
  title: { marginTop: 20, fontSize: 26, fontWeight: '700', color: '#22331f', textAlign: 'center' },
  body: { marginTop: 12, fontSize: 15, lineHeight: 22, color: '#4a5c4d', textAlign: 'center' },
  input: {
    marginTop: 28,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cdd8ca',
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 18,
    color: '#22331f',
    textAlign: 'center',
  },
  cta: { marginTop: 24, paddingVertical: 16, borderRadius: 14, backgroundColor: '#3a7d44', alignItems: 'center' },
  ctaDisabled: { backgroundColor: '#bcd0bd' },
  ctaText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
