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
import { RecipeImage } from '@/components/RecipeImage';
import { SwipeRow } from '@/components/SwipeRow';
import {
  Button,
  Card,
  Chip,
  EmptyState,
  Heading,
  LargeTitle,
  SegmentedControl,
} from '@/components/ui';
import { parseIngredient } from '@/lib/ingredients';
import {
  dateInDays,
  EXPIRY_PRESETS,
  expiringSoon,
  expiryLabel,
  expiryState,
  PLACES,
  placeOf,
  type Place,
} from '@/lib/inventory';
import { rankRecipes } from '@/lib/pantry';
import {
  addFridgeItems,
  clearFridge,
  removeFridgeItem,
  setAssumeStaples,
  updateFridgeItem,
  useStore,
} from '@/lib/store';
import type { FridgeItem } from '@/lib/types';
import { radius, shadow, useTheme } from '@/theme/colors';

const nameOf = (l: string) => parseIngredient(l).name.split(',')[0];

export default function InventoryScreen() {
  const t = useTheme();
  const router = useRouter();
  const { recipes, fridge } = useStore();
  const [place, setPlace] = useState<Place>('fridge');
  const [draft, setDraft] = useState('');
  const [expiry, setExpiry] = useState<number | null>(null); // dager frem, eller ingen dato

  const inPlace = fridge.items.filter((i) => placeOf(i) === place);
  const soonItems = expiringSoon(fridge.items);
  const names = fridge.items.map((i) => i.name);
  const ranked = rankRecipes(
    recipes,
    names,
    fridge.assumeStaples,
    soonItems.map((i) => i.name),
  );
  const placeLabel = PLACES.find((p) => p.id === place)!.label.toLowerCase();

  function submit() {
    addFridgeItems(draft, {
      place,
      expires: expiry !== null ? dateInDays(expiry) : undefined,
    });
    setDraft('');
    setExpiry(null);
  }

  function pickExpiry(item: FridgeItem) {
    const options = [...EXPIRY_PRESETS.map((p) => `Om ${p.label}`), 'Fjern utløpsdato', 'Avbryt'];
    if (Platform.OS !== 'ios') return;
    ActionSheetIOS.showActionSheetWithOptions(
      { title: `Utløpsdato for ${item.name}`, options, cancelButtonIndex: options.length - 1 },
      (i) => {
        if (i < EXPIRY_PRESETS.length)
          updateFridgeItem(item.id, { expires: dateInDays(EXPIRY_PRESETS[i].days) });
        else if (i === EXPIRY_PRESETS.length) updateFridgeItem(item.id, { expires: null });
      },
    );
  }

  function menu(item: FridgeItem) {
    if (Platform.OS !== 'ios') return;
    const others = PLACES.filter((p) => p.id !== placeOf(item));
    const options = [
      'Endre navn',
      item.expires ? 'Endre utløpsdato' : 'Sett utløpsdato (valgfritt)',
      ...others.map((p) => `Flytt til ${p.label.toLowerCase()}`),
      'Avbryt',
    ];
    ActionSheetIOS.showActionSheetWithOptions(
      { title: item.name, options, cancelButtonIndex: options.length - 1 },
      (i) => {
        if (i === 0) {
          Alert.prompt(
            'Endre navn',
            undefined,
            (text) => text && updateFridgeItem(item.id, { name: text }),
            'plain-text',
            item.name,
          );
        } else if (i === 1) pickExpiry(item);
        else if (i < options.length - 1) updateFridgeItem(item.id, { place: others[i - 2].id });
      },
    );
  }

  function confirmClear() {
    Alert.alert(`Tømme ${placeLabel}?`, 'Alle varene her fjernes fra listen.', [
      { text: 'Avbryt', style: 'cancel' },
      { text: 'Tøm', style: 'destructive', onPress: () => clearFridge(place) },
    ]);
  }

  return (
    <View style={[styles.flex, { backgroundColor: t.background }]}>
      <LargeTitle title="Lager" />
      <SegmentedControl
        value={place}
        onChange={setPlace}
        options={PLACES.map((p) => ({
          value: p.id,
          label: `${p.label} (${fridge.items.filter((i) => placeOf(i) === p.id).length})`,
        }))}
      />
      <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
        <View style={[styles.addRow, shadow, { backgroundColor: t.card }]}>
          <TextInput
            accessibilityLabel={`Legg til vare i ${placeLabel}`}
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
        <View style={styles.chips}>
          <Text style={[styles.hint, { color: t.textSecondary }]}>Utløpsdato (valgfritt):</Text>
          {[{ label: 'Ingen', days: null as number | null }, ...EXPIRY_PRESETS].map((p) => (
            <Pressable
              key={p.label}
              accessibilityRole="button"
              accessibilityState={{ selected: expiry === p.days }}
              onPress={() => setExpiry(p.days)}
            >
              <View
                style={[styles.chip, { backgroundColor: expiry === p.days ? t.tint : t.tintSoft }]}
              >
                <Text
                  style={{
                    color: expiry === p.days ? '#FFFFFF' : t.tint,
                    fontWeight: '600',
                    fontSize: 13,
                  }}
                >
                  {p.label}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>

        {soonItems.length > 0 ? (
          <Card>
            <Heading>Bruk opp snart</Heading>
            {soonItems.map((i) => (
              <Text
                key={i.id}
                style={{ color: expiryState(i) === 'expired' ? t.danger : t.text, fontSize: 15 }}
              >
                {i.name} · {expiryLabel(i.expires!)}
              </Text>
            ))}
            {ranked.filter((r) => r.usesSoon.length > 0).length > 0 ? (
              <Text style={{ color: t.textSecondary }}>
                Forslag som bruker dem opp:{' '}
                {ranked
                  .filter((r) => r.usesSoon.length > 0)
                  .slice(0, 3)
                  .map((r) => r.recipe.title)
                  .join(', ')}
              </Text>
            ) : null}
          </Card>
        ) : null}

        <View style={styles.items}>
          {inPlace.length === 0 ? (
            <Text style={[styles.hint, { color: t.textSecondary }]}>
              Ingenting i {placeLabel} ennå. Skriv flere varer med komma mellom. Norsk og engelsk
              går bra.
            </Text>
          ) : (
            <Text style={[styles.hint, { color: t.textSecondary }]}>
              Sveip mot høyre for å fjerne, venstre for flere valg.
            </Text>
          )}
          {inPlace.map((item) => {
            const state = expiryState(item);
            return (
              <SwipeRow
                key={item.id}
                accessibilityLabel={item.name}
                right={{ label: 'Fjern', color: t.danger, run: () => removeFridgeItem(item.id) }}
                left={{ label: 'Valg', color: t.tint, run: () => menu(item) }}
              >
                <View style={[styles.item, { backgroundColor: t.card, borderColor: t.border }]}>
                  <Text style={[styles.itemText, { color: t.text }]}>{item.name}</Text>
                  {item.expires ? (
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: '600',
                        color:
                          state === 'expired'
                            ? t.danger
                            : state === 'soon'
                              ? '#B26A00'
                              : t.textSecondary,
                      }}
                    >
                      {expiryLabel(item.expires)}
                    </Text>
                  ) : null}
                </View>
              </SwipeRow>
            );
          })}
          {inPlace.length > 0 ? (
            <Button title={`Tøm ${placeLabel}`} kind="destructive" onPress={confirmClear} />
          ) : null}
        </View>

        <Card>
          <View style={styles.switchRow}>
            <Text style={[styles.switchLabel, { color: t.text }]}>
              Anta at salt, pepper, vann og olje finnes (kun i forslagene her)
            </Text>
            <Switch
              value={fridge.assumeStaples}
              onValueChange={setAssumeStaples}
              trackColor={{ true: t.tint }}
            />
          </View>
        </Card>

        <Heading>Forslag</Heading>
        {recipes.length === 0 ? (
          <EmptyState emoji="📖" title="Ingen oppskrifter" text="Legg inn oppskrifter først." />
        ) : fridge.items.length === 0 ? (
          <Text style={[styles.hint, { color: t.textSecondary }]}>
            Legg inn hva du har, så rangerer vi oppskriftene etter hvor mye du allerede har.
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
                    {fit.missing.length === 0 && fit.similar.length === 0
                      ? 'Alt du trenger!'
                      : fit.missing.length === 0
                        ? `Nesten alt (${fit.similar.length} lignende)`
                        : `Mangler ${fit.missing.length} av ${fit.total}`}
                  </Chip>
                </View>
                {fit.usesSoon.length > 0 ? (
                  <Text style={{ color: t.tint, fontWeight: '600' }}>
                    Bruker opp: {fit.usesSoon.join(', ')}
                  </Text>
                ) : null}
                {fit.missing.length > 0 ? (
                  <Text style={{ color: t.textSecondary }} numberOfLines={2}>
                    {fit.missing.map(nameOf).join(', ')}
                  </Text>
                ) : null}
                {fit.similar.length > 0 ? (
                  <Text style={{ color: t.textSecondary }} numberOfLines={2}>
                    Lignende: {fit.similar.map((x) => nameOf(x.line)).join(', ')}
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
  chips: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  chip: { borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5 },
  hint: { fontSize: 13 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  switchLabel: { flex: 1, fontSize: 15 },
  items: { gap: 6 },
  item: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  itemText: { fontSize: 16, flexShrink: 1 },
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
