import { StatusBar } from 'expo-status-bar';
import ThisWeekScreen from './components/ThisWeekScreen';

export default function App() {
  return (
    <>
      <ThisWeekScreen />
      <StatusBar style="auto" />
    </>
  );
}
