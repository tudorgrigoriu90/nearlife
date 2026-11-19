import { Children, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

// The banners above the tabs (offline, preview, another county) share one status-bar gap
// (T-318 · review B-38): each used to carry its own 44 px, so two together left a hole between
// them. Each banner now pads only itself.

export const STATUS_BAR_GAP = 44;

export default function BannerStack({ children }: { children: ReactNode }) {
  const shown = Children.toArray(children);
  if (shown.length === 0) return null;
  return (
    <View testID="banner-stack" style={styles.stack}>
      {shown}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { paddingTop: STATUS_BAR_GAP, backgroundColor: '#fbe9c6' },
});
