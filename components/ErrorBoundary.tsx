import { Component, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { createTranslator, type Locale } from '../lib/i18n';

// The app's last line (T-323 · review I-02): a render error anywhere used to leave a blank screen
// with no way back. This shows what happened and a "Back to start" that mounts the app afresh, and
// passes the error on to crash reporting, which sends it only with analytics consent.

interface Props {
  locale: Locale;
  report: (error: Error) => void;
  children: ReactNode;
}

export default class ErrorBoundary extends Component<Props, { failed: boolean; round: number }> {
  state = { failed: false, round: 0 };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    this.props.report(error);
  }

  render() {
    if (!this.state.failed) {
      return <View key={this.state.round} style={styles.fill}>{this.props.children}</View>;
    }
    const tr = createTranslator(this.props.locale);
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{tr('error.title')}</Text>
        <Text style={styles.body}>{tr('error.body')}</Text>
        <Pressable
          style={styles.cta}
          accessibilityRole="button"
          onPress={() => this.setState((s) => ({ failed: false, round: s.round + 1 }))}
        >
          <Text style={styles.ctaText}>{tr('error.restart')}</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  container: { flex: 1, backgroundColor: '#f4f8f2', justifyContent: 'center', padding: 24 },
  title: { fontSize: 22, fontWeight: '800', color: '#2f5d34', textAlign: 'center' },
  body: { marginTop: 12, fontSize: 15, lineHeight: 22, color: '#4a5c4d', textAlign: 'center' },
  cta: { marginTop: 24, paddingVertical: 16, borderRadius: 14, backgroundColor: '#3a7d44', alignItems: 'center' },
  ctaText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
