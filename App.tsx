import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>🌿 Nearby</Text>
      <Text style={styles.subtitle}>Discover the wild life that shares your world.</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f8f2',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#2f5d34',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 16,
    color: '#4a5c4d',
    textAlign: 'center',
  },
});
