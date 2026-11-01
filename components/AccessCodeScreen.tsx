import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { createTranslator, type Locale, type TranslationKey } from '../lib/i18n';
import { redeemAccessCode, type AccessCodeGateway, type AccessCodeResult } from '../lib/reviewerAccess';

// Access code (T-237). Google Play reviewers cannot buy anything, so they get a code in the Play
// Console "App access" form and enter it here; the server unlocks the Full Game and every county
// for this account. Nothing here unlocks anything by itself: the answer comes from the server.

const MESSAGE: Record<Exclude<AccessCodeResult, 'empty'>, TranslationKey> = {
  unlocked: 'access.unlocked',
  invalid: 'access.invalid',
  failed: 'access.failed',
};

export default function AccessCodeScreen({
  locale = 'en',
  gateway,
  onUnlocked,
  onDone,
}: {
  locale?: Locale;
  gateway: AccessCodeGateway;
  /** Re-read what the account owns, so the unlock shows at once. */
  onUnlocked: () => void;
  onDone: () => void;
}) {
  const tr = createTranslator(locale);
  const [code, setCode] = useState('');
  const [result, setResult] = useState<AccessCodeResult | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    const outcome = await redeemAccessCode(gateway, code);
    setBusy(false);
    setResult(outcome);
    if (outcome === 'unlocked') onUnlocked();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🔑</Text>
      <Text style={styles.title}>{tr('access.title')}</Text>
      {result === 'unlocked' ? (
        <Text style={styles.success}>{tr('access.unlocked')}</Text>
      ) : (
        <>
          <Text style={styles.body}>{tr('access.body')}</Text>
          <TextInput
            style={styles.input}
            value={code}
            onChangeText={setCode}
            placeholder={tr('access.placeholder')}
            placeholderTextColor="#9fb0a0"
            accessibilityLabel={tr('access.placeholder')}
            autoCapitalize="characters"
            autoCorrect={false}
            editable={!busy}
          />
          {result && result !== 'empty' ? <Text style={styles.error}>{tr(MESSAGE[result])}</Text> : null}
          <Pressable
            style={[styles.cta, busy && styles.ctaDisabled]}
            disabled={busy}
            onPress={submit}
            accessibilityRole="button"
            accessibilityState={{ disabled: busy }}
          >
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.ctaText}>{tr('access.cta')}</Text>}
          </Pressable>
        </>
      )}
      <Pressable style={styles.doneBtn} onPress={onDone} accessibilityRole="button">
        <Text style={styles.doneText}>{tr('settings.done')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f8f2', paddingHorizontal: 28, justifyContent: 'center' },
  emoji: { fontSize: 52, textAlign: 'center' },
  title: { marginTop: 16, fontSize: 24, fontWeight: '700', color: '#22331f', textAlign: 'center' },
  body: { marginTop: 12, fontSize: 15, lineHeight: 22, color: '#4a5c4d', textAlign: 'center' },
  success: { marginTop: 12, fontSize: 16, lineHeight: 22, color: '#2f7d4f', textAlign: 'center', fontWeight: '600' },
  input: {
    marginTop: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cdd8ca',
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#22331f',
    letterSpacing: 1,
  },
  error: { marginTop: 12, fontSize: 14, color: '#b3261e', fontWeight: '600' },
  cta: { marginTop: 20, paddingVertical: 16, borderRadius: 14, backgroundColor: '#3a7d44', alignItems: 'center', justifyContent: 'center', minHeight: 52 },
  ctaDisabled: { opacity: 0.7 },
  ctaText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  doneBtn: { marginTop: 12, paddingVertical: 14, alignItems: 'center' },
  doneText: { fontSize: 16, fontWeight: '600', color: '#3a7d44' },
});
