import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { linkEmail, type AuthGateway, type LinkFailure } from '../lib/accountLinking';
import { createTranslator, type Locale, type TranslationKey } from '../lib/i18n';

// Link-email screen (T-133 · reinstall / cross-device survival). Optional and off the onboarding
// path (invariant: first-run stays frictionless). An anonymous session survives restarts but not
// reinstall or a second device; linking an email (Supabase sends a confirmation) makes the
// collection durable. The AuthGateway is injected so this is fully unit-testable without a live
// Supabase. The tested state machine (validate → signed-in → not-already-linked → link) lives in
// lib/accountLinking; this screen only renders it. NOTE: on-device layout not visually verified.

const FAILURE_KEY: Record<LinkFailure, TranslationKey> = {
  'invalid-email': 'link.error.invalid',
  'already-linked': 'link.error.already',
  'not-signed-in': 'link.error.failed', // in-app there is always a session; treat as generic
  'link-failed': 'link.error.failed',
};

export default function LinkEmail({
  locale = 'en',
  gateway,
  onDone,
}: {
  locale?: Locale;
  gateway: AuthGateway;
  onDone: () => void;
}) {
  const tr = createTranslator(locale);
  const [email, setEmail] = useState('');
  const [linkedEmail, setLinkedEmail] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState<TranslationKey | null>(null);
  const [linking, setLinking] = useState(false);

  // Show the already-linked state if this account has a confirmed email.
  useEffect(() => {
    let cancelled = false;
    gateway
      .currentIdentity()
      .then((id) => {
        if (!cancelled && id?.email) setLinkedEmail(id.email);
      })
      .catch(() => {
        // No identity yet is fine — the user can still attempt to link.
      });
    return () => {
      cancelled = true;
    };
  }, [gateway]);

  const submit = async () => {
    setErrorKey(null);
    setLinking(true);
    const result = await linkEmail(gateway, email);
    setLinking(false);
    if (result.ok) {
      setSentTo(result.email); // confirmation email sent; link completes when the user taps it
    } else {
      setErrorKey(FAILURE_KEY[result.reason]);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>📧</Text>
      <Text style={styles.title}>{tr('link.title')}</Text>

      {linkedEmail ? (
        <Text style={styles.body}>{tr('link.current', { email: linkedEmail })}</Text>
      ) : sentTo ? (
        <Text style={styles.sent}>{tr('link.sent', { email: sentTo })}</Text>
      ) : (
        <>
          <Text style={styles.body}>{tr('link.body')}</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder={tr('link.placeholder')}
            placeholderTextColor="#9fb0a0"
            accessibilityLabel={tr('link.placeholder')}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!linking}
          />
          {errorKey ? <Text style={styles.error}>{tr(errorKey)}</Text> : null}
          <Pressable
            style={[styles.cta, linking && styles.ctaDisabled]}
            disabled={linking}
            onPress={submit}
            accessibilityRole="button"
            accessibilityState={{ disabled: linking }}
          >
            {linking ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.ctaText}>{tr('link.cta')}</Text>
            )}
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
  sent: { marginTop: 12, fontSize: 15, lineHeight: 22, color: '#2f7d4f', textAlign: 'center', fontWeight: '600' },
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
  },
  error: { marginTop: 12, fontSize: 14, color: '#b3261e', fontWeight: '600' },
  cta: { marginTop: 20, paddingVertical: 16, borderRadius: 14, backgroundColor: '#3a7d44', alignItems: 'center', justifyContent: 'center', minHeight: 52 },
  ctaDisabled: { opacity: 0.7 },
  ctaText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  doneBtn: { marginTop: 12, paddingVertical: 14, alignItems: 'center' },
  doneText: { fontSize: 16, fontWeight: '600', color: '#3a7d44' },
});
