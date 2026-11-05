import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { tierStateFor, type CollectionRecord } from '../lib/collection';
import { createTranslator, type Locale, type TranslationKey } from '../lib/i18n';
import type { ContentLocale } from '../lib/i18n/contentLocale';
import {
  canAttempt,
  findByExactName,
  pickLookalikes,
  quizOptions,
  recordAttempt,
  type QuizAttempts,
} from '../lib/sightingQuiz';
import { groupOf } from '../lib/species/group';
import { commonNameFor } from '../lib/species/localized';
import { photoFor } from '../lib/species/media';
import type { Month, Species } from '../lib/species/types';

// "I saw…" (T-242): name what you saw, pick it out of four photos. The logic, and the Director's
// rules (exact name only, one try per species per day), live in lib/sightingQuiz (T-241). The
// choices show photos only: a name under each would give the answer away.

export interface QuizAttemptStore {
  load(): Promise<QuizAttempts>;
  save(attempts: QuizAttempts): Promise<void>;
}

type Step =
  | { kind: 'name'; message: string | null }
  | { kind: 'quiz'; target: Species; options: Species[] }
  | { kind: 'result'; target: Species; outcome: 'added' | 'praised' | 'wrong' };

export default function SightingQuizScreen({
  locale = 'en',
  pool,
  records,
  month,
  today,
  attemptStore,
  onSpotted,
  onOpenSpecies,
  onDone,
}: {
  locale?: Locale;
  /** The species of the user's county, as the Almanac lists them. */
  pool: Species[];
  records: CollectionRecord[];
  month: Month;
  /** Device-local day key ("YYYY-MM-DD"), for the one-try-a-day rule. */
  today: string;
  attemptStore: QuizAttemptStore;
  onSpotted: (speciesId: string) => void;
  onOpenSpecies?: (species: Species) => void;
  onDone: () => void;
}) {
  const tr = createTranslator(locale);
  const content = locale as ContentLocale;
  const [input, setInput] = useState('');
  const [step, setStep] = useState<Step>({ kind: 'name', message: null });
  const [attempts, setAttempts] = useState<QuizAttempts>({});
  const nameOf = useMemo(() => (s: Species) => commonNameFor(s, content), [content]);

  useEffect(() => {
    let cancelled = false;
    attemptStore
      .load()
      .then((a) => {
        if (!cancelled) setAttempts(a);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [attemptStore]);

  const start = () => {
    const typed = input.trim();
    const target = findByExactName(pool, typed, content)[0];
    if (!target) {
      setStep({ kind: 'name', message: tr('quiz.noMatch', { name: typed }) });
      return;
    }
    if (!canAttempt(attempts, target.id, today)) {
      setStep({ kind: 'name', message: tr('quiz.tomorrow', { name: nameOf(target) }) });
      return;
    }
    const lookalikes = pickLookalikes(target, pool, month, 3, today);
    if (!photoFor(target) || lookalikes.length === 0) {
      setStep({ kind: 'name', message: tr('quiz.noPhoto', { name: nameOf(target) }) });
      return;
    }
    setStep({ kind: 'quiz', target, options: quizOptions(target, lookalikes, today) });
  };

  const choose = (target: Species, picked: Species) => {
    const next = recordAttempt(attempts, target.id, today);
    setAttempts(next);
    void attemptStore.save(next).catch(() => undefined);
    if (picked.id !== target.id) {
      setStep({ kind: 'result', target, outcome: 'wrong' });
    } else if (tierStateFor(records, target.id).spotted) {
      setStep({ kind: 'result', target, outcome: 'praised' });
    } else {
      onSpotted(target.id);
      setStep({ kind: 'result', target, outcome: 'added' });
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>👁 {tr('quiz.title')}</Text>

        {step.kind === 'name' ? (
          <>
            <Text style={styles.body}>{tr('quiz.body')}</Text>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              onSubmitEditing={start}
              placeholder={tr('quiz.placeholder')}
              placeholderTextColor="#7a8a7c"
              accessibilityLabel={tr('quiz.placeholder')}
              autoCorrect={false}
              returnKeyType="next"
            />
            {step.message ? <Text style={styles.message}>{step.message}</Text> : null}
            <Pressable style={styles.cta} onPress={start} accessibilityRole="button">
              <Text style={styles.ctaText}>{tr('quiz.next')}</Text>
            </Pressable>
          </>
        ) : null}

        {step.kind === 'quiz' ? (
          <>
            <Text style={styles.question}>{tr('quiz.question')}</Text>
            <View style={styles.grid}>
              {step.options.map((option) => (
                <Pressable
                  key={option.id}
                  testID={`quiz-option-${option.id}`}
                  onPress={() => choose(step.target, option)}
                  accessibilityRole="button"
                  style={styles.option}
                >
                  <Image
                    source={{ uri: photoFor(option)!.url }}
                    style={styles.optionPhoto}
                    resizeMode="cover"
                  />
                </Pressable>
              ))}
            </View>
          </>
        ) : null}

        {step.kind === 'result' ? (
          <>
            <Text style={step.outcome === 'wrong' ? styles.wrong : styles.right}>
              {step.outcome === 'added'
                ? tr('quiz.added', { name: nameOf(step.target) })
                : step.outcome === 'praised'
                  ? tr(`quiz.praise.${groupOf(step.target)}` as TranslationKey)
                  : tr('quiz.wrong', { name: nameOf(step.target) })}
            </Text>
            <Image
              testID="quiz-answer-photo"
              source={{ uri: photoFor(step.target)!.url }}
              style={styles.answerPhoto}
              resizeMode="cover"
            />
            {onOpenSpecies ? (
              <Pressable
                style={styles.cta}
                onPress={() => onOpenSpecies(step.target)}
                accessibilityRole="button"
              >
                <Text style={styles.ctaText}>{tr('quiz.open')}</Text>
              </Pressable>
            ) : null}
          </>
        ) : null}

        <Pressable style={styles.doneBtn} onPress={onDone} accessibilityRole="button">
          <Text style={styles.doneText}>{tr('settings.done')}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f8f2' },
  scroll: { paddingTop: 64, paddingHorizontal: 20, paddingBottom: 32 },
  title: { fontSize: 26, fontWeight: '700', color: '#2f5d34' },
  body: { marginTop: 12, fontSize: 15, lineHeight: 22, color: '#4a5c4d' },
  input: {
    marginTop: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cdd8ca',
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 17,
    color: '#22331f',
  },
  message: { marginTop: 12, fontSize: 14, lineHeight: 20, color: '#8a4b1f', fontWeight: '600' },
  question: { marginTop: 16, fontSize: 18, fontWeight: '700', color: '#22331f' },
  grid: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  option: {
    width: '48%',
    aspectRatio: 1,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#e2ebe0',
  },
  optionPhoto: { width: '100%', height: '100%' },
  right: { marginTop: 16, fontSize: 18, lineHeight: 26, fontWeight: '700', color: '#2f7d4f' },
  wrong: { marginTop: 16, fontSize: 17, lineHeight: 24, fontWeight: '600', color: '#8a4b1f' },
  answerPhoto: {
    marginTop: 14,
    width: '100%',
    height: 220,
    borderRadius: 16,
    backgroundColor: '#e2ebe0',
  },
  cta: {
    marginTop: 18,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: '#3a7d44',
    alignItems: 'center',
  },
  ctaText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  doneBtn: { marginTop: 12, paddingVertical: 14, alignItems: 'center' },
  doneText: { fontSize: 16, fontWeight: '600', color: '#3a7d44' },
});
