import { useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { Body, Button, Card, Heading } from '@/components/ui';
import { DEPARTMENTS, moveDepartment, normalizeOrder } from '@/lib/departments';
import {
  addStoreProfile,
  removeStoreProfile,
  updateSettings,
  updateStoreProfile,
  useStore,
} from '@/lib/store';
import { useTheme } from '@/theme/colors';

/** Egne butikker: velg rekkefølgen på avdelingene slik at handlelisten følger veien du går. */
export default function StoresScreen() {
  const t = useTheme();
  const { settings } = useStore();
  const [openId, setOpenId] = useState<string | null>(null);

  function create() {
    if (Platform.OS !== 'ios') return;
    Alert.prompt('Ny butikk', 'F.eks. Kiwi Majorstua eller Meny sentrum.', (name) => {
      const id = name ? addStoreProfile(name) : null;
      if (id) setOpenId(id);
    });
  }

  function rename(id: string, current: string) {
    if (Platform.OS !== 'ios') return;
    Alert.prompt(
      'Endre navn',
      undefined,
      (name) => name && updateStoreProfile(id, { name }),
      'plain-text',
      current,
    );
  }

  function confirmDelete(id: string, name: string) {
    Alert.alert(`Slette «${name}»?`, 'Rekkefølgen for denne butikken fjernes.', [
      { text: 'Avbryt', style: 'cancel' },
      { text: 'Slett', style: 'destructive', onPress: () => removeStoreProfile(id) },
    ]);
  }

  return (
    <Screen>
      <Body secondary>
        Lag en butikk og flytt avdelingene opp og ned slik de kommer i den butikken. Velg butikken
        på handlelisten når den er sortert etter avdeling.
      </Body>

      <Card>
        <Heading>Standard</Heading>
        <Body secondary>{DEPARTMENTS.join(' → ')}</Body>
        <Button
          title={settings.activeStoreId === null ? 'Valgt' : 'Bruk standard'}
          kind="secondary"
          disabled={settings.activeStoreId === null}
          onPress={() => updateSettings({ activeStoreId: null })}
        />
      </Card>

      {settings.stores.map((st) => {
        const order = normalizeOrder(st.order);
        const open = openId === st.id;
        return (
          <Card key={st.id}>
            <Heading>{st.name}</Heading>
            <View style={styles.buttons}>
              <View style={styles.flex}>
                <Button
                  title={settings.activeStoreId === st.id ? 'Valgt' : 'Bruk'}
                  kind="secondary"
                  disabled={settings.activeStoreId === st.id}
                  onPress={() => updateSettings({ activeStoreId: st.id })}
                />
              </View>
              <View style={styles.flex}>
                <Button
                  title={open ? 'Lukk' : 'Endre rekkefølge'}
                  kind="secondary"
                  onPress={() => setOpenId(open ? null : st.id)}
                />
              </View>
            </View>
            {open ? (
              <View style={styles.order}>
                {order.map((dep, i) => (
                  <View key={dep} style={[styles.row, { borderColor: t.border }]}>
                    <Text style={[styles.num, { color: t.textSecondary }]}>{i + 1}</Text>
                    <Text style={[styles.dep, { color: t.text }]}>{dep}</Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Flytt ${dep} opp`}
                      disabled={i === 0}
                      hitSlop={8}
                      onPress={() =>
                        updateStoreProfile(st.id, { order: moveDepartment(order, i, -1) })
                      }
                    >
                      <Text style={[styles.arrow, { color: i === 0 ? t.border : t.tint }]}>▲</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Flytt ${dep} ned`}
                      disabled={i === order.length - 1}
                      hitSlop={8}
                      onPress={() =>
                        updateStoreProfile(st.id, { order: moveDepartment(order, i, 1) })
                      }
                    >
                      <Text
                        style={[
                          styles.arrow,
                          { color: i === order.length - 1 ? t.border : t.tint },
                        ]}
                      >
                        ▼
                      </Text>
                    </Pressable>
                  </View>
                ))}
                <Button
                  title="Endre navn"
                  kind="secondary"
                  onPress={() => rename(st.id, st.name)}
                />
                <Button
                  title="Slett butikk"
                  kind="destructive"
                  onPress={() => confirmDelete(st.id, st.name)}
                />
              </View>
            ) : null}
          </Card>
        );
      })}

      <Button title="Ny butikk" onPress={create} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  buttons: { flexDirection: 'row', gap: 8 },
  order: { gap: 6 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 10,
  },
  num: { width: 20, fontWeight: '700' },
  dep: { flex: 1, fontSize: 16 },
  arrow: { fontSize: 20, paddingHorizontal: 6 },
});
