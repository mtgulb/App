import * as Clipboard from 'expo-clipboard';
import { Alert, Share } from 'react-native';
import { Body, Button, Card, Heading } from '@/components/ui';
import { createBackup, keepLocalImages, parseBackup } from '@/lib/backup';
import { getState, restoreState } from '@/lib/store';
import { t } from '@/i18n';

export function BackupCard() {
  async function create() {
    try {
      await Share.share({ message: createBackup(getState()), title: t('backup.shareTitle') });
    } catch {
      Alert.alert(t('backup.failedTitle'));
    }
  }

  async function restore() {
    const text = await Clipboard.getStringAsync();
    const current = getState();
    const res = parseBackup(text, current);
    if (!res.ok) {
      Alert.alert(t(`backup.${res.reason}`));
      return;
    }
    const { summary } = res;
    Alert.alert(
      t('backup.confirmTitle'),
      t('backup.confirmBody', {
        recipes: summary.recipes,
        plan: summary.plan,
        stock: summary.stock,
        shopping: summary.shoppingItems,
      }),
      [
        { text: t('backup.cancel'), style: 'cancel' },
        {
          text: t('backup.confirmYes'),
          style: 'destructive',
          onPress: () => {
            restoreState(keepLocalImages(res.state, current));
            Alert.alert(t('backup.doneTitle'), t('backup.doneBody'));
          },
        },
      ],
    );
  }

  return (
    <Card>
      <Heading>{t('backup.title')}</Heading>
      <Body secondary>{t('backup.intro')}</Body>
      <Button title={t('backup.create')} kind="secondary" onPress={create} />
      <Button title={t('backup.restore')} kind="secondary" onPress={restore} />
      <Body secondary>{t('backup.restoreHint')}</Body>
    </Card>
  );
}
