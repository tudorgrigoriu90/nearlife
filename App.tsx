import { StatusBar } from 'expo-status-bar';
import ThisWeekScreen from './components/ThisWeekScreen';
import { detectDeviceLocale } from './lib/i18n/deviceLocale';

export default function App() {
  // Device locale for now; a user override from Settings will take precedence (T-123).
  const locale = detectDeviceLocale();
  return (
    <>
      <ThisWeekScreen locale={locale} />
      <StatusBar style="auto" />
    </>
  );
}
