import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import App from './App';

// T-229: Android 15+ (and Expo SDK 57) draw apps edge to edge, so content runs under the system
// navigation bar, and on iOS under the home indicator. Every screen renders inside App, so one safe
// area here keeps every bottom button clear of the system bars on every device. The top edge is
// left out: screens already pad below the status bar, and adding the inset there would double it.
export default function AppRoot() {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f4f8f2' }} edges={['bottom', 'left', 'right']}>
        <App />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
