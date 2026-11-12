import Constants from 'expo-constants';
import { Linking, Pressable, StyleSheet, Text } from 'react-native';
import { Screen } from '@/components/Screen';
import { Body, Card, Heading } from '@/components/ui';
import { useTheme } from '@/theme/colors';

const OFF_URL = 'https://world.openfoodfacts.org';
const ODBL_URL = 'https://opendatacommons.org/licenses/odbl/1-0/';

function LinkText({ title, url }: { title: string; url: string }) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={title}
      onPress={() => Linking.openURL(url)}
    >
      <Text style={[styles.link, { color: t.tint }]}>{title}</Text>
    </Pressable>
  );
}

export default function About() {
  const version = Constants.expoConfig?.version ?? '';
  return (
    <Screen>
      <Card>
        <Heading>Om appen</Heading>
        <Body secondary>Versjon {version}</Body>
      </Card>
      <Card>
        <Heading>Kilder og lisenser</Heading>
        <Body>
          Strekkodeoppslag bruker data fra Open Food Facts, tilgjengelig under Open Database License
          (ODbL). Innholdet i databasen er lisensiert under Database Contents License. Når du
          skanner en vare, sendes bare strekkodenummeret til Open Food Facts.
        </Body>
        <LinkText title="Open Food Facts" url={OFF_URL} />
        <LinkText title="Open Database License (ODbL)" url={ODBL_URL} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  link: { fontSize: 16, fontWeight: '600', paddingVertical: 6 },
});
