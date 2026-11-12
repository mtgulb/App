import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActionSheetIOS,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { RecipeFitCard } from '@/components/RecipeFitCard';
import { SwipeRow } from '@/components/SwipeRow';
import { Button, Card, Heading, LargeTitle } from '@/components/ui';
import { rankRecipes } from '@/lib/pantry';
import {
  addSessionItems,
  endSession,
  removeSessionItem,
  setUseStock,
  suggestionBasis,
  toggleStorageIncluded,
  useSession,
  type SessionItem,
} from '@/lib/session';
import { addFridgeItems, setAssumeStaples, useStore } from '@/lib/store';
import { radius, shadow, useTheme } from '@/theme/colors';

/**
 * «Hva kan jeg lage?» – en midlertidig økt. Det du skriver inn her lagres ikke på lageret,
 * og forsvinner når du avslutter økten. Lageret kan hentes inn, men endres ikke.
 */
export default function SuggestScreen() {
  const t = useTheme();
  const router = useRouter();
  const { recipes, fridge } = useStore();
  const session = useSession();
  const [draft, setDraft] = useState('');

  const { names, soon } = suggestionBasis(fridge, session);
  const ranked = rankRecipes(recipes, names, fridge.assumeStaples, soon);

  function submit() {
    addSessionItems(draft);
    setDraft('');
  }

  /** Flytter en midlertidig vare til lageret (bevisst valg) og tar den ut av økten. */
  function saveToStock(item: SessionItem) {
    const put = (storageId: string) => {
      addFridgeItems(item.name, { place: storageId });
      removeSessionItem(item.id);
    };
    if (fridge.storages.length === 1) {
      put(fridge.storages[0].id);
      return;
    }
    if (Platform.OS !== 'ios') return;
    const options = [...fridge.storages.map((s) => `Legg i ${s.name}`), 'Avbryt'];
    ActionSheetIOS.showActionSheetWithOptions(
      { title: item.name, options, cancelButtonIndex: options.length - 1 },
      (i) => {
        if (i < fridge.storages.length) put(fridge.storages[i].id);
      },
    );
  }

  function confirmEnd() {
    if (session.items.length === 0) {
      endSession();
      return;
    }
    Alert.alert(
      'Avslutte økten?',
      `De ${session.items.length} midlertidige varene fjernes. Lageret berøres ikke.`,
      [
        { text: 'Avbryt', style: 'cancel' },
        { text: 'Avslutt', style: 'destructive', onPress: endSession },
      ],
    );
  }

  return (
    <View style={[styles.flex, { backgroundColor: t.background }]}>
      <LargeTitle title="Forslag" />
      <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
        <Text style={[styles.hint, { color: t.textSecondary }]}>
          Finn ut hva du kan lage nå. Det du skriver inn her er midlertidig: det lagres ikke på
          lageret og forsvinner når du avslutter økten.
        </Text>

        <Card>
          <View style={styles.switchRow}>
            <View style={styles.flex}>
              <Text style={[styles.label, { color: t.text }]}>Ta med det jeg har på lager</Text>
              <Text style={{ color: t.textSecondary, fontSize: 13 }}>
                {fridge.items.length} {fridge.items.length === 1 ? 'vare' : 'varer'} på lageret
              </Text>
            </View>
            <Switch
              value={session.useStock}
              onValueChange={setUseStock}
              trackColor={{ true: t.tint }}
            />
          </View>
          {session.useStock && fridge.storages.length > 1 ? (
            <View style={styles.chips}>
              {fridge.storages.map((s) => {
                const on = !session.excluded.includes(s.id);
                return (
                  <Pressable
                    key={s.id}
                    accessibilityRole="switch"
                    accessibilityState={{ checked: on }}
                    onPress={() => toggleStorageIncluded(s.id)}
                    style={[styles.chip, { backgroundColor: on ? t.tint : t.tintSoft }]}
                  >
                    <Text
                      style={{ color: on ? '#FFFFFF' : t.tint, fontWeight: '700', fontSize: 13 }}
                    >
                      {on ? '✓ ' : ''}
                      {s.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </Card>

        <View style={[styles.addRow, shadow, { backgroundColor: t.card }]}>
          <TextInput
            accessibilityLabel="Skriv inn det du har nå"
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={submit}
            placeholder="Skriv inn det du har nå. F.eks. kylling, ris"
            placeholderTextColor={t.textSecondary}
            returnKeyType="done"
            autoCorrect={false}
            style={[styles.addInput, { color: t.text }]}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Legg til"
            onPress={submit}
            style={[styles.addBtn, { backgroundColor: t.tint }]}
          >
            <Text style={styles.addBtnText}>Legg til</Text>
          </Pressable>
        </View>

        {session.items.length > 0 ? (
          <View style={styles.items}>
            <Text style={[styles.section, { color: t.textSecondary }]}>
              Midlertidig (lagres ikke) · sveip mot høyre for å fjerne, venstre for å legge på
              lageret
            </Text>
            {session.items.map((item) => (
              <SwipeRow
                key={item.id}
                accessibilityLabel={item.name}
                right={{ label: 'Fjern', color: t.danger, run: () => removeSessionItem(item.id) }}
                left={{ label: 'Legg på lager', color: t.tint, run: () => saveToStock(item) }}
              >
                <View style={[styles.item, { backgroundColor: t.card, borderColor: t.border }]}>
                  <Text style={[styles.itemText, { color: t.text }]}>{item.name}</Text>
                </View>
              </SwipeRow>
            ))}
          </View>
        ) : null}

        {session.items.length > 0 || !session.useStock || session.excluded.length > 0 ? (
          <Button title="Avslutt økt" kind="secondary" onPress={confirmEnd} />
        ) : null}

        <Card>
          <View style={styles.switchRow}>
            <Text style={[styles.label, styles.flex, { color: t.text }]}>
              Anta at salt, pepper, vann og olje finnes
            </Text>
            <Switch
              value={fridge.assumeStaples}
              onValueChange={setAssumeStaples}
              trackColor={{ true: t.tint }}
            />
          </View>
        </Card>

        <Heading>Du kan lage</Heading>
        {recipes.length === 0 ? (
          <Text style={[styles.hint, { color: t.textSecondary }]}>Legg inn oppskrifter først.</Text>
        ) : names.length === 0 ? (
          <Text style={[styles.hint, { color: t.textSecondary }]}>
            Skriv inn hva du har, eller ta med lageret, så rangerer vi oppskriftene dine.
          </Text>
        ) : (
          ranked.map((fit) => (
            <RecipeFitCard
              key={fit.recipe.id}
              fit={fit}
              onPress={() =>
                router.push({ pathname: '/recipe/[id]', params: { id: fit.recipe.id } })
              }
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { paddingHorizontal: 20, paddingBottom: 40, gap: 12 },
  hint: { fontSize: 13 },
  section: { fontSize: 13, fontWeight: '700' },
  label: { fontSize: 15, fontWeight: '600' },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderRadius: 16, paddingHorizontal: 12, paddingVertical: 7 },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius,
    paddingLeft: 16,
    paddingRight: 8,
    paddingVertical: 6,
    gap: 8,
  },
  addInput: { flex: 1, fontSize: 16, paddingVertical: 10 },
  addBtn: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  addBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  items: { gap: 6 },
  item: { borderRadius: 14, borderWidth: 1, padding: 14 },
  itemText: { fontSize: 16 },
});
