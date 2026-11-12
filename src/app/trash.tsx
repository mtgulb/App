import { Alert, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { Body, Button, Card } from '@/components/ui';
import { daysLeft } from '@/lib/trash';
import { purgeFromTrash, restoreRecipe, useTrash } from '@/lib/store';
import { t } from '@/i18n';

const clock = () => Date.now();

export default function Trash() {
  const items = useTrash();
  const now = clock();
  return (
    <Screen>
      <Body secondary>{t('trash.intro')}</Body>
      {items.length === 0 ? <Body>{t('trash.empty')}</Body> : null}
      {items.map((item) => (
        <Card key={item.recipe.id}>
          <Body>{item.recipe.title}</Body>
          <Body secondary>{t('trash.daysLeft', { count: daysLeft(item, now) })}</Body>
          <View style={{ gap: 8 }}>
            <Button title={t('trash.restore')} onPress={() => restoreRecipe(item.recipe.id)} />
            <Button
              title={t('trash.purge')}
              kind="destructive"
              onPress={() =>
                Alert.alert(
                  t('trash.purgeTitle'),
                  t('trash.purgeBody', { title: item.recipe.title }),
                  [
                    { text: t('trash.cancel'), style: 'cancel' },
                    {
                      text: t('trash.purge'),
                      style: 'destructive',
                      onPress: () => purgeFromTrash(item.recipe.id),
                    },
                  ],
                )
              }
            />
          </View>
        </Card>
      ))}
    </Screen>
  );
}
