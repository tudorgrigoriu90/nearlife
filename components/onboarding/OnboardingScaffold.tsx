import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

// Shared onboarding step layout (T-022+): a centred hero emoji, title, body, an optional
// footnote (e.g. the privacy reassurance), and a primary CTA. Every onboarding screen reuses
// this so the steps feel like one flow. All copy is passed in already-localised by the caller.

export default function OnboardingScaffold({
  emoji,
  title,
  body,
  footnote,
  ctaLabel,
  onNext,
  children,
}: {
  emoji: string;
  title: string;
  body: string;
  footnote?: string;
  ctaLabel: string;
  onNext: () => void;
  children?: ReactNode;
}) {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.emoji}>{emoji}</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{body}</Text>
        {children}
      </View>
      <View style={styles.footer}>
        {footnote ? <Text style={styles.footnote}>{footnote}</Text> : null}
        <Pressable style={styles.cta} onPress={onNext} accessibilityRole="button">
          <Text style={styles.ctaText}>{ctaLabel}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f8f2', paddingHorizontal: 28, paddingTop: 96, paddingBottom: 40 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 72, marginBottom: 24 },
  title: { fontSize: 28, fontWeight: '700', color: '#2f5d34', textAlign: 'center' },
  body: { marginTop: 16, fontSize: 16, lineHeight: 24, color: '#4a5c4d', textAlign: 'center' },
  footer: { gap: 12 },
  footnote: { fontSize: 12, color: '#7a8a7c', textAlign: 'center', fontStyle: 'italic' },
  cta: { paddingVertical: 16, borderRadius: 14, backgroundColor: '#3a7d44', alignItems: 'center' },
  ctaText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
