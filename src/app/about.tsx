import Constants from 'expo-constants';
import { StyleSheet, Text } from 'react-native';
import { Screen } from '@/components/Screen';
import { useTheme } from '@/theme/colors';

export default function AboutScreen() {
  const theme = useTheme();
  return (
    <Screen>
      <Text style={[styles.text, { color: theme.text }]}>
        Versjon {Constants.expoConfig?.version}
      </Text>
      <Text style={[styles.text, { color: theme.textSecondary }]}>
        Bygget med Expo, React Native og TypeScript.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({ text: { fontSize: 16, lineHeight: 22 } });
