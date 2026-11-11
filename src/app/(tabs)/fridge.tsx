import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
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
import { RecipeImage } from '@/components/RecipeImage';
import { SwipeRow } from '@/components/SwipeRow';
import { Button, Card, Chip, EmptyState, Heading, LargeTitle } from '@/components/ui';
import { parseIngredient } from '@/lib/ingredients';
import { rankRecipes } from '@/lib/pantry';
import {
  addFridgeItems,
  clearFridge,
  removeFridgeItem,
  renameFridgeItem,
  setAssumeStaples,
  useStore,
} from '@/lib/store';
import type { FridgeItem } from '@/lib/types';
import { radius, shadow, useTheme } from '@/theme/colors';

export default function FridgeScreen() {
  const t = useTheme();
  const router = useRouter();
  const { recipes, fridge } = useStore();
  const [draft, setDraft] = useState('');

  const names = fridge.items.map((i) => i.name);
  const ranked = rankRecipes(recipes, names, fridge.assumeStaples);

  function submit() {
    addFridgeItems(draft);
    setDraft('');
  }

  function edit(item: FridgeItem) {
    if (Platform.OS === 'ios') {
      Alert.prompt(
        'Rediger vare',
        undefined,
        (text) => text !== undefined && renameFridgeItem(item.id, text),
        'plain-text',
        item.name,
      );
    }
  }

  function confirmClear() {
    Alert.alert('Tømme kjøleskapet?', 'Alle varene fjernes fra listen.', [
      { text: 'Avbryt', style: 'cancel' },
      { text: 'Tøm', style: 'destructive', onPress: clearFridge },
    ]);
  }

  return (
    <View style={[styles.flex, { backgroundColor: t.background }]}>
      <LargeTitle title="Kjøleskap" />
      <ScrollView
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="never"
      >
        <View style={[styles.addRow, shadow, { backgroundColor: t.card }]}>
          <TextInput
            accessibilityLabel="Legg til vare i kjøleskapet"
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={submit}
            placeholder="Hva har du? F.eks. melk, egg, ost"
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
        <Text style={[styles.hint, { color: t.textSecondary }]}>
          Skriv flere varer med komma mellom. Norsk og engelsk går bra, f.eks. «mel» og «flour».
        </Text>

        <Card>
          <View style={styles.switchRow}>
            <Text style={[styles.switchLabel, { color: t.text }]}>
              Anta at salt, pepper, vann og olje finnes
            </Text>
            <Switch
              value={fridge.assumeStaples}
              onValueChange={setAssumeStaples}
              trackColor={{ true: t.tint }}
            />
          </View>
        </Card>

        {fridge.items.length > 0 ? (
          <View style={styles.items}>
            <Text style={[styles.section, { color: t.textSecondary }]}>
              Du har ({fridge.items.length}) · sveip mot høyre for å fjerne, venstre for å redigere
            </Text>
            {fridge.items.map((item) => (
              <SwipeRow
                key={item.id}
                accessibilityLabel={item.name}
                right={{ label: 'Fjern', color: t.danger, run: () => removeFridgeItem(item.id) }}
                left={{ label: 'Rediger', color: t.tint, run: () => edit(item) }}
              >
                <View style={[styles.item, { backgroundColor: t.card, borderColor: t.border }]}>
                  <Text style={[styles.itemText, { color: t.text }]}>{item.name}</Text>
                </View>
              </SwipeRow>
            ))}
            <Button title="Tøm kjøleskapet" kind="destructive" onPress={confirmClear} />
          </View>
        ) : null}

        <Heading>Forslag</Heading>
        {recipes.length === 0 ? (
          <EmptyState emoji="📖" title="Ingen oppskrifter" text="Legg inn oppskrifter først." />
        ) : fridge.items.length === 0 ? (
          <Text style={[styles.hint, { color: t.textSecondary }]}>
            Legg inn hva du har i kjøleskapet, så rangerer vi oppskriftene etter hvor mye du
            allerede har.
          </Text>
        ) : (
          ranked.map((fit) => (
            <Pressable
              key={fit.recipe.id}
              accessibilityRole="button"
              accessibilityLabel={`${fit.recipe.title}, ${fit.missing.length === 0 ? 'alt finnes' : `mangler ${fit.missing.length}`}`}
              onPress={() =>
                router.push({ pathname: '/recipe/[id]', params: { id: fit.recipe.id } })
              }
              style={({ pressed }) => [
                styles.fit,
                shadow,
                { backgroundColor: t.card, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <RecipeImage uri={fit.recipe.images[0]} style={styles.thumb} />
              <View style={styles.flex}>
                <Text style={[styles.fitTitle, { color: t.text }]} numberOfLines={2}>
                  {fit.recipe.title}
                </Text>
                <View style={styles.chipRow}>
                  <Chip>
                    {fit.missing.length === 0
                      ? 'Alt du trenger!'
                      : `Mangler ${fit.missing.length} av ${fit.total}`}
                  </Chip>
                </View>
                {fit.missing.length > 0 ? (
                  <Text style={{ color: t.textSecondary }} numberOfLines={2}>
                    {fit.missing.map((l) => parseIngredient(l).name.split(',')[0]).join(', ')}
                  </Text>
                ) : null}
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { paddingHorizontal: 20, paddingBottom: 40, gap: 12 },
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
  hint: { fontSize: 13 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  switchLabel: { flex: 1, fontSize: 15 },
  items: { gap: 6 },
  section: { fontSize: 13, fontWeight: '700' },
  item: { borderRadius: 14, borderWidth: 1, padding: 14 },
  itemText: { fontSize: 16 },
  fit: {
    flexDirection: 'row',
    borderRadius: radius,
    overflow: 'hidden',
    gap: 12,
    alignItems: 'center',
  },
  thumb: { width: 84, height: 84 },
  fitTitle: { fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },
  chipRow: { flexDirection: 'row', marginVertical: 4 },
});
