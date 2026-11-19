import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { requestSignInCode, verifySignInCode, type SignInGateway } from '../lib/accountSignIn';
import { createTranslator, type Locale, type TranslationKey } from '../lib/i18n';

// "I already have an account" (T-271 · review B-07): sign back in with the email linked in
// Settings (T-133). Two steps, one-time code: email → 6-digit code. A wrong code leaves the
// current session untouched; on success the App swaps in that account's collection and purchases.

export default function SignIn({
  locale = 'en',
  gateway,
  onSignedIn,
  onCancel,
}: {
  locale?: Locale;
  gateway: SignInGateway;
  onSignedIn: (userId: string) => void;
  onCancel: () => void;
}) {
  const tr = createTranslator(locale);
  const [email, setEmail] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [errorKey, setErrorKey] = useState<TranslationKey | null>(null);
  const [busy, setBusy] = useState(false);

  const send = async () => {
    setErrorKey(null);
    setBusy(true);
    const result = await requestSignInCode(gateway, email);
    setBusy(false);
    if (result.ok) setSentTo(result.email);
    else
      setErrorKey(result.reason === 'invalid-email' ? 'link.error.invalid' : 'signin.error.send');
  };

  const verify = async () => {
    if (!sentTo) return;
    setErrorKey(null);
    setBusy(true);
    const result = await verifySignInCode(gateway, sentTo, code);
    setBusy(false);
    if (result.ok) onSignedIn(result.userId);
    else
      setErrorKey(result.reason === 'invalid-code' ? 'signin.error.format' : 'signin.error.code');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🔑</Text>
      <Text style={styles.title}>{tr('signin.title')}</Text>
      <Text style={styles.body}>
        {sentTo ? tr('signin.codeSent', { email: sentTo }) : tr('signin.body')}
      </Text>
      <TextInput
        key={sentTo ? 'code' : 'email'}
        style={styles.input}
        value={sentTo ? code : email}
        onChangeText={sentTo ? setCode : setEmail}
        placeholder={sentTo ? tr('signin.codePlaceholder') : tr('link.placeholder')}
        placeholderTextColor="#566658"
        accessibilityLabel={sentTo ? tr('signin.codePlaceholder') : tr('link.placeholder')}
        keyboardType={sentTo ? 'number-pad' : 'email-address'}
        autoCapitalize="none"
        autoCorrect={false}
        editable={!busy}
      />
      {errorKey ? <Text style={styles.error}>{tr(errorKey)}</Text> : null}
      <Pressable
        style={[styles.cta, busy && styles.ctaDisabled]}
        disabled={busy}
        onPress={sentTo ? verify : send}
        accessibilityRole="button"
        accessibilityState={{ disabled: busy }}
      >
        {busy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.ctaText}>{tr(sentTo ? 'signin.verify' : 'signin.send')}</Text>
        )}
      </Pressable>
      <Pressable style={styles.doneBtn} onPress={onCancel} accessibilityRole="button">
        <Text style={styles.doneText}>{tr('minigame.cancel')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f8f2',
    paddingHorizontal: 28,
    justifyContent: 'center',
  },
  emoji: { fontSize: 52, textAlign: 'center' },
  title: { marginTop: 16, fontSize: 24, fontWeight: '700', color: '#22331f', textAlign: 'center' },
  body: { marginTop: 12, fontSize: 15, lineHeight: 22, color: '#4a5c4d', textAlign: 'center' },
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
  cta: {
    marginTop: 20,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: '#3a7d44',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  ctaDisabled: { opacity: 0.7 },
  ctaText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  doneBtn: { marginTop: 12, paddingVertical: 14, alignItems: 'center' },
  doneText: { fontSize: 16, fontWeight: '600', color: '#336f3c' },
});
