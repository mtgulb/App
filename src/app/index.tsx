import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { useTheme } from '@/theme/colors';

export default function HomeScreen() {
  const theme = useTheme();
  return (
    <Screen>
      <View style={[styles.card, { backgroundColor: theme.card }]}>
        <Text style={[styles.title, { color: theme.text }]}>Velkommen</Text>
        <Text style={[styles.body, { color: theme.textSecondary }]}>
          Dette er prosjektets tekniske grunnmur. Appens funksjoner er ikke definert ennå.
        </Text>
      </View>
      <Link href="/about" asChild>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Les om appen"
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: theme.tint, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Text style={styles.buttonText}>Om appen</Text>
        </Pressable>
      </Link>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, padding: 20, gap: 8 },
  title: { fontSize: 22, fontWeight: '700' },
  body: { fontSize: 16, lineHeight: 22 },
  button: { minHeight: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '600' },
});
