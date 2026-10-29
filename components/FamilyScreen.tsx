import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  FAMILY_MAX_PEOPLE,
  familyErrorKey,
  normalizeInviteCode,
  type FamilyGateway,
  type Household,
} from '../lib/family';
import { createTranslator, type Locale, type TranslationKey } from '../lib/i18n';

// Family screen (T-103). Three states, all decided by the server (T-102):
// - in no family: join with a code; a Family buyer can also start their family;
// - owner: the code to share, how many of the 5 seats are taken, and remove a member;
// - member: their status and "leave".
// The Full Game a member gets is derived on the server, so after any change the screen calls
// `onChanged` and the app re-reads what the user owns. Buying Family is the Store's job (T-085);
// this screen never sells, it only manages (invariant #4).

/** "ABCD2345" → "ABCD 2345": easier to read aloud and to copy by eye. */
function grouped(code: string): string {
  return `${code.slice(0, 4)} ${code.slice(4)}`;
}

const MAX = { max: FAMILY_MAX_PEOPLE };

export default function FamilyScreen({
  locale = 'en',
  gateway,
  ownsFamily,
  onChanged,
  onDone,
}: {
  locale?: Locale;
  gateway: FamilyGateway;
  /** The user holds the Family purchase themselves, so they can start a family. */
  ownsFamily: boolean;
  /** Membership changed: re-read entitlements (the Full Game comes and goes with it). */
  onChanged?: () => void;
  onDone?: () => void;
}) {
  const tr = createTranslator(locale);
  const [household, setHousehold] = useState<Household | null | undefined>(undefined);
  const [typed, setTyped] = useState('');
  const [error, setError] = useState<TranslationKey | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    gateway
      .mine()
      .then(setHousehold)
      .catch(() => {
        setHousehold(null);
        setError('family.error.generic');
      });
  }, [gateway]);

  useEffect(load, [load]);

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      onChanged?.();
      load();
    } catch (e) {
      setError(familyErrorKey(e));
    } finally {
      setBusy(false);
    }
  };

  const join = () => {
    const code = normalizeInviteCode(typed);
    if (code === null) {
      setError('family.join.invalid');
      return;
    }
    void run(() => gateway.join(code));
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{tr('family.title')} 👪</Text>
        {onDone ? (
          <Pressable onPress={onDone} accessibilityRole="button">
            <Text style={styles.done}>{tr('settings.done')}</Text>
          </Pressable>
        ) : null}
      </View>
      <Text style={styles.subtitle}>{tr('family.intro', MAX)}</Text>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {household === undefined ? (
          <ActivityIndicator color="#3a7d44" />
        ) : household === null ? (
          <View style={styles.card}>
            {ownsFamily ? (
              <Pressable
                onPress={() => void run(() => gateway.create())}
                disabled={busy}
                accessibilityRole="button"
                style={styles.primary}
              >
                <Text style={styles.primaryText}>{tr('family.create.cta')}</Text>
              </Pressable>
            ) : null}
            <Text style={styles.label}>{tr('family.join.label')}</Text>
            <TextInput
              value={typed}
              onChangeText={setTyped}
              placeholder={tr('family.join.placeholder')}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={10}
              style={styles.input}
            />
            <Pressable onPress={join} disabled={busy} accessibilityRole="button" style={styles.secondary}>
              <Text style={styles.secondaryText}>{tr('family.join.cta')}</Text>
            </Pressable>
          </View>
        ) : household.role === 'owner' ? (
          <View style={styles.card}>
            {!household.active ? <Text style={styles.note}>{tr('family.inactive')}</Text> : null}
            <Text style={styles.label}>{tr('family.owner.code')}</Text>
            {household.inviteCode ? <Text style={styles.code}>{grouped(household.inviteCode)}</Text> : null}
            {household.inviteCode ? (
              <Pressable
                onPress={() =>
                  void Share.share({
                    message: tr('family.owner.shareMessage', { code: grouped(household.inviteCode ?? '') }),
                  }).catch(() => undefined)
                }
                accessibilityRole="button"
                style={styles.primary}
              >
                <Text style={styles.primaryText}>{tr('family.owner.share')}</Text>
              </Pressable>
            ) : null}
            <Text style={styles.label}>{tr('family.owner.people', { people: household.people, ...MAX })}</Text>
            {household.members.map((m) => (
              <View key={m.id} style={styles.memberRow}>
                <Text style={styles.memberText}>
                  {tr('family.owner.member', { date: new Date(m.joinedAt).toLocaleDateString(locale) })}
                </Text>
                <Pressable
                  onPress={() => void run(() => gateway.remove(m.id))}
                  disabled={busy}
                  accessibilityRole="button"
                >
                  <Text style={styles.danger}>{tr('family.owner.remove')}</Text>
                </Pressable>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.status}>
              {household.active
                ? tr('family.member.status', { people: household.people, ...MAX })
                : tr('family.inactive')}
            </Text>
            <Pressable
              onPress={() => void run(() => gateway.leave())}
              disabled={busy}
              accessibilityRole="button"
              style={styles.secondary}
            >
              <Text style={styles.danger}>{tr('family.member.leave')}</Text>
            </Pressable>
          </View>
        )}

        {error ? <Text style={styles.error}>{tr(error, MAX)}</Text> : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f8f2', paddingTop: 56, paddingHorizontal: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 },
  title: { fontSize: 28, fontWeight: '700', color: '#2f5d34' },
  done: { fontSize: 16, fontWeight: '600', color: '#3a7d44' },
  subtitle: { marginTop: 4, marginBottom: 16, fontSize: 14, lineHeight: 20, color: '#4a5c4d', paddingHorizontal: 4 },
  scroll: { paddingBottom: 32 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, gap: 10 },
  label: { fontSize: 14, fontWeight: '600', color: '#22331f' },
  input: {
    borderWidth: 1,
    borderColor: '#cdd8ca',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 18,
    letterSpacing: 2,
  },
  primary: { backgroundColor: '#3a7d44', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  primaryText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  secondary: { backgroundColor: '#eaf4ea', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  secondaryText: { color: '#2f7d4f', fontSize: 15, fontWeight: '600' },
  code: { fontSize: 30, fontWeight: '700', letterSpacing: 4, color: '#2f5d34', textAlign: 'center' },
  memberRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  memberText: { fontSize: 14, color: '#4a5c4d' },
  status: { fontSize: 15, lineHeight: 22, color: '#22331f' },
  note: { fontSize: 14, lineHeight: 20, color: '#8a5a1f' },
  danger: { fontSize: 14, fontWeight: '600', color: '#b3402f' },
  error: { marginTop: 12, fontSize: 14, color: '#b3402f', textAlign: 'center', paddingHorizontal: 12 },
});
