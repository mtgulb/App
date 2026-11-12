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
import { DatePickerModal, formatDateLabel } from '@/components/DatePickerModal';
import { RecipeFitCard } from '@/components/RecipeFitCard';
import { SwipeRow } from '@/components/SwipeRow';
import { Button, Card, Heading, LargeTitle } from '@/components/ui';
import {
  dateInDays,
  EXPIRY_PRESETS,
  expiringSoon,
  expiryLabel,
  expiryState,
} from '@/lib/inventory';
import { rankRecipes } from '@/lib/pantry';
import {
  addFridgeItems,
  addStorage,
  clearFridge,
  removeFridgeItem,
  removeStorage,
  setAssumeStaples,
  updateFridgeItem,
  updateSettings,
  updateStorage,
  useStore,
} from '@/lib/store';
import type { FridgeItem, StorageDef } from '@/lib/types';
import { radius, shadow, useTheme } from '@/theme/colors';

export default function StockScreen() {
  const t = useTheme();
  const router = useRouter();
  const { recipes, fridge, settings } = useStore();
  const { storages } = fridge;

  const [selectedId, setSelectedId] = useState<string>(storages[0].id);
  const selected = storages.find((s) => s.id === selectedId) ?? storages[0];
  const [draft, setDraft] = useState('');
  const [expires, setExpires] = useState<string | null>(null);
  const [pickingFor, setPickingFor] = useState<'new' | FridgeItem | null>(null);

  const inStorage = fridge.items.filter((i) => i.place === selected.id);
  const soonItems = expiringSoon(fridge.items);
  const ranked = settings.stockSuggestions
    ? rankRecipes(
        recipes,
        fridge.items.map((i) => i.name),
        fridge.assumeStaples,
        soonItems.map((i) => i.name),
      )
    : [];
  const dateChips = [
    { label: 'Ingen', value: null as string | null },
    ...EXPIRY_PRESETS.map((p) => ({ label: p.label, value: dateInDays(p.days) })),
  ];
  const isCustom = expires !== null && !dateChips.some((c) => c.value === expires);

  function submit() {
    addFridgeItems(draft, { place: selected.id, expires: expires ?? undefined });
    setDraft('');
    setExpires(null);
  }

  function newStorage() {
    if (Platform.OS !== 'ios') return;
    Alert.prompt(
      'Nytt lager',
      'F.eks. Kjøleskap, Fryser, Skap eller Kjeller.',
      (name) => {
        const id = name ? addStorage(name) : null;
        if (id) setSelectedId(id);
      },
      'plain-text',
    );
  }

  function storageMenu(s: StorageDef) {
    if (Platform.OS !== 'ios') return;
    const options = [
      'Endre navn',
      s.freezer ? 'Ikke marker som fryser' : 'Marker som fryser (for påminnelser om å tine)',
      'Slett lager',
      'Avbryt',
    ];
    ActionSheetIOS.showActionSheetWithOptions(
      { title: s.name, options, cancelButtonIndex: 3, destructiveButtonIndex: 2 },
      (i) => {
        if (i === 0) {
          Alert.prompt(
            'Endre navn',
            undefined,
            (name) => name && updateStorage(s.id, { name }),
            'plain-text',
            s.name,
          );
        } else if (i === 1) updateStorage(s.id, { freezer: !s.freezer });
        else if (i === 2) {
          if (storages.length <= 1) {
            Alert.alert('Kan ikke slettes', 'Du må ha minst ett lager.');
            return;
          }
          const n = fridge.items.filter((x) => x.place === s.id).length;
          Alert.alert(
            `Slette «${s.name}»?`,
            n > 0 ? `De ${n} varene i lageret slettes også.` : 'Lageret er tomt.',
            [
              { text: 'Avbryt', style: 'cancel' },
              {
                text: 'Slett',
                style: 'destructive',
                onPress: () => {
                  removeStorage(s.id);
                  setSelectedId(storages.find((x) => x.id !== s.id)!.id);
                },
              },
            ],
          );
        }
      },
    );
  }

  function itemMenu(item: FridgeItem) {
    if (Platform.OS !== 'ios') return;
    const others = storages.filter((s) => s.id !== item.place);
    const options = [
      'Endre navn',
      item.expires ? 'Endre dato' : 'Sett dato (valgfritt)',
      ...others.map((s) => `Flytt til ${s.name}`),
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
        } else if (i === 1) setPickingFor(item);
        else if (i < options.length - 1) updateFridgeItem(item.id, { place: others[i - 2].id });
      },
    );
  }

  function confirmClear() {
    Alert.alert(`Tømme «${selected.name}»?`, 'Alle varene her fjernes.', [
      { text: 'Avbryt', style: 'cancel' },
      { text: 'Tøm', style: 'destructive', onPress: () => clearFridge(selected.id) },
    ]);
  }

  return (
    <View style={[styles.flex, { backgroundColor: t.background }]}>
      <LargeTitle title="Lager" />
      <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
        <Text style={[styles.hint, { color: t.textSecondary }]}>
          Dette er varene du har. De ligger her til du fjerner dem. Vil du bare prøve hva du kan
          lage med noe annet akkurat nå, bruk fanen «Forslag».
        </Text>

        <View style={styles.storages}>
          {storages.map((s) => {
            const active = s.id === selected.id;
            const count = fridge.items.filter((i) => i.place === s.id).length;
            return (
              <Pressable
                key={s.id}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => setSelectedId(s.id)}
                onLongPress={() => storageMenu(s)}
                style={[styles.storageChip, { backgroundColor: active ? t.tint : t.tintSoft }]}
              >
                <Text style={{ color: active ? '#FFFFFF' : t.tint, fontWeight: '700' }}>
                  {s.name} ({count})
                </Text>
              </Pressable>
            );
          })}
          <Pressable
            accessibilityRole="button"
            onPress={newStorage}
            style={[styles.storageChip, { borderWidth: 1, borderColor: t.tint }]}
          >
            <Text style={{ color: t.tint, fontWeight: '700' }}>+ Nytt lager</Text>
          </Pressable>
        </View>
        <Pressable accessibilityRole="button" onPress={() => storageMenu(selected)}>
          <Text style={{ color: t.tint, fontWeight: '600' }}>
            Valg for «{selected.name}» (navn, fryser, slett)
          </Text>
        </Pressable>

        <View style={[styles.addRow, shadow, { backgroundColor: t.card }]}>
          <TextInput
            accessibilityLabel={`Legg til vare i ${selected.name}`}
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={submit}
            placeholder={`Legg til i ${selected.name}. F.eks. melk, egg`}
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
          {dateChips.map((c) => (
            <Pressable
              key={c.label}
              accessibilityRole="button"
              accessibilityState={{ selected: expires === c.value }}
              onPress={() => setExpires(c.value)}
            >
              <View
                style={[
                  styles.chip,
                  { backgroundColor: expires === c.value ? t.tint : t.tintSoft },
                ]}
              >
                <Text
                  style={{
                    color: expires === c.value ? '#FFFFFF' : t.tint,
                    fontWeight: '600',
                    fontSize: 13,
                  }}
                >
                  {c.label}
                </Text>
              </View>
            </Pressable>
          ))}
          <Pressable accessibilityRole="button" onPress={() => setPickingFor('new')}>
            <View style={[styles.chip, { backgroundColor: isCustom ? t.tint : t.tintSoft }]}>
              <Text
                style={{ color: isCustom ? '#FFFFFF' : t.tint, fontWeight: '600', fontSize: 13 }}
              >
                {isCustom ? formatDateLabel(expires!) : 'Velg dato …'}
              </Text>
            </View>
          </Pressable>
        </View>

        <View style={styles.items}>
          {inStorage.length === 0 ? (
            <Text style={[styles.hint, { color: t.textSecondary }]}>
              Ingenting i «{selected.name}» ennå. Skriv flere varer med komma mellom. Norsk og
              engelsk går bra.
            </Text>
          ) : (
            <Text style={[styles.hint, { color: t.textSecondary }]}>
              Sveip mot høyre for å fjerne, venstre for flere valg.
            </Text>
          )}
          {inStorage.map((item) => {
            const state = expiryState(item);
            return (
              <SwipeRow
                key={item.id}
                accessibilityLabel={item.name}
                right={{ label: 'Fjern', color: t.danger, run: () => removeFridgeItem(item.id) }}
                left={{ label: 'Valg', color: t.tint, run: () => itemMenu(item) }}
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
          {inStorage.length > 0 ? (
            <Button title={`Tøm «${selected.name}»`} kind="destructive" onPress={confirmClear} />
          ) : null}
        </View>

        {soonItems.length > 0 ? (
          <Card>
            <Heading>Går snart ut</Heading>
            {soonItems.map((i) => (
              <Text
                key={i.id}
                style={{ color: expiryState(i) === 'expired' ? t.danger : t.text, fontSize: 15 }}
              >
                {i.name} · {expiryLabel(i.expires!)}
              </Text>
            ))}
          </Card>
        ) : null}

        <Card>
          <View style={styles.switchRow}>
            <View style={styles.flex}>
              <Text style={[styles.switchLabel, { color: t.text }]}>
                Foreslå oppskrifter ut fra lageret
              </Text>
              <Text style={{ color: t.textSecondary, fontSize: 13 }}>
                Slå av hvis du ikke vil ha forslag her.
              </Text>
            </View>
            <Switch
              value={settings.stockSuggestions}
              onValueChange={(v) => updateSettings({ stockSuggestions: v })}
              trackColor={{ true: t.tint }}
            />
          </View>
          {settings.stockSuggestions ? (
            <View style={styles.switchRow}>
              <Text style={[styles.switchLabel, styles.flex, { color: t.text }]}>
                Anta at salt, pepper, vann og olje finnes
              </Text>
              <Switch
                value={fridge.assumeStaples}
                onValueChange={setAssumeStaples}
                trackColor={{ true: t.tint }}
              />
            </View>
          ) : null}
        </Card>

        {settings.stockSuggestions ? (
          <>
            <Heading>Forslag fra lageret</Heading>
            {recipes.length === 0 ? (
              <Text style={[styles.hint, { color: t.textSecondary }]}>
                Legg inn oppskrifter først.
              </Text>
            ) : fridge.items.length === 0 ? (
              <Text style={[styles.hint, { color: t.textSecondary }]}>
                Legg inn det du har, så rangerer vi oppskriftene etter hvor mye du allerede har.
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
          </>
        ) : null}
      </ScrollView>

      {pickingFor ? (
        <DatePickerModal
          title={pickingFor === 'new' ? 'Utløpsdato' : `Dato for ${pickingFor.name}`}
          value={pickingFor === 'new' ? (expires ?? undefined) : pickingFor.expires}
          onCancel={() => setPickingFor(null)}
          onConfirm={(date) => {
            if (pickingFor === 'new') setExpires(date);
            else updateFridgeItem(pickingFor.id, { expires: date });
            setPickingFor(null);
          }}
          onClear={
            pickingFor !== 'new' && pickingFor.expires
              ? () => {
                  updateFridgeItem(pickingFor.id, { expires: null });
                  setPickingFor(null);
                }
              : undefined
          }
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { paddingHorizontal: 20, paddingBottom: 40, gap: 12 },
  storages: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  storageChip: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 9 },
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
  switchLabel: { fontSize: 15, fontWeight: '600' },
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
});
