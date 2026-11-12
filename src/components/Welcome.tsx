import { StyleSheet, Text, View } from 'react-native';
import { Button, Heading } from '@/components/ui';
import { t } from '@/i18n';
import { useTheme } from '@/theme/colors';

/** Vises i stedet for en tom oppskriftsliste: kort veiledning for nye brukere. */
export function Welcome({ onAdd, onSettings }: { onAdd: () => void; onSettings: () => void }) {
  const th = useTheme();
  const steps = ['welcome.step1', 'welcome.step2', 'welcome.step3', 'welcome.step4'] as const;
  return (
    <View style={styles.wrap}>
      <Text style={styles.emoji}>🍳</Text>
      <Heading>{t('welcome.title')}</Heading>
      <Text style={[styles.text, { color: th.textSecondary }]}>{t('welcome.intro')}</Text>
      <View style={styles.steps}>
        {steps.map((key, i) => (
          <View key={key} style={styles.step}>
            <View style={[styles.num, { backgroundColor: th.tint }]}>
              <Text style={styles.numText}>{i + 1}</Text>
            </View>
            <Text style={[styles.stepText, { color: th.text }]}>{t(key)}</Text>
          </View>
        ))}
      </View>
      <Button title={t('welcome.add')} onPress={onAdd} />
      <Button title={t('welcome.settings')} kind="secondary" onPress={onSettings} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 14, paddingVertical: 24 },
  emoji: { fontSize: 44, textAlign: 'center' },
  text: { fontSize: 16, lineHeight: 23, textAlign: 'center' },
  steps: { gap: 12, marginVertical: 6 },
  step: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  num: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  numText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  stepText: { flex: 1, fontSize: 16, lineHeight: 23 },
});
