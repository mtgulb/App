import Constants from 'expo-constants';
import { Linking, Pressable, StyleSheet, Text } from 'react-native';
import { Screen } from '@/components/Screen';
import { Body, Card, Heading } from '@/components/ui';
import { useTheme } from '@/theme/colors';
import { t } from '@/i18n';

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
        <Heading>{t('about.title')}</Heading>
        <Body secondary>{t('about.version', { version })}</Body>
      </Card>
      <Card>
        <Heading>{t('about.contact')}</Heading>
        <LinkText title="panful@tande-gulbrandsen.no" url="mailto:panful@tande-gulbrandsen.no" />
      </Card>
      <Card>
        <Heading>{t('about.sources')}</Heading>
        <Body>{t('about.sourcesBody')}</Body>
        <LinkText title="Open Food Facts" url={OFF_URL} />
        <LinkText title="Open Database License (ODbL)" url={ODBL_URL} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  link: { fontSize: 16, fontWeight: '600', paddingVertical: 6 },
});
