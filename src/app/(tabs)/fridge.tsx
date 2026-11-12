import { SymbolView } from 'expo-symbols';
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
import { Heading, LargeTitle } from '@/components/ui';
import { EXPIRY_PRESETS, expiringSoon, expiryLabel, expiryState } from '@/lib/inventory';
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
  const [showSoon, setShowSoon] = useState(false);

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

  /** Alle valg for lageret samlet bak «⋯». */
  function storageMenu(s: StorageDef) {
    if (Platform.OS !== 'ios') return;
    const n = fridge.items.filter((x) => x.place === s.id).length;
    const options = [
      'Endre navn',
      s.freezer ? 'Ikke marker som fryser' : 'Marker som fryser',
      ...(n > 0 ? [`Tøm «${s.name}»`] : []),
      'Slett lager',
      'Avbryt',
    ];
    const deleteIndex = options.length - 2;
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: s.name,
        message: s.freezer ? 'Fryser (brukes til påminnelser om å tine)' : undefined,
        options,
        cancelButtonIndex: options.length - 1,
        destructiveButtonIndex: deleteIndex,
      },
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
        else if (n > 0 && i === 2) {
          Alert.alert(`Tømme «${s.name}»?`, 'Alle varene her fjernes.', [
            { text: 'Avbryt', style: 'cancel' },
            { text: 'Tøm', style: 'destructive', onPress: () => clearFridge(s.id) },
          ]);
        } else if (i === deleteIndex) {
          if (storages.length <= 1) {
            Alert.alert('Kan ikke slettes', 'Du må ha minst ett lager.');
            return;
          }
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
      item.expires ? 'Endre dato' : 'Sett dato',
      ...others.map((s) => `Flytt til ${s.name}`),
      'Avbryt',
    ];
    ActionSheetIOS.showActionSheetWithOptions(
      { title: item.name, message: item.product, options, cancelButtonIndex: options.length - 1 },
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

  return (
    <View style={[styles.flex, { backgroundColor: t.background }]}>
      <LargeTitle title="Lager" />
      <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
        {/* Lagre: små chips på én linje, alle valg bak ⋯ */}
        <View style={styles.storageBar}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.storages}
          >
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
                  <Text
                    style={{ color: active ? '#FFFFFF' : t.tint, fontWeight: '700', fontSize: 14 }}
                  >
                    {s.name} {count}
                  </Text>
                </Pressable>
              );
            })}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Nytt lager"
              onPress={newStorage}
              style={[styles.storageChip, { borderWidth: 1, borderColor: t.tint }]}
            >
              <Text style={{ color: t.tint, fontWeight: '700', fontSize: 14 }}>+</Text>
            </Pressable>
          </ScrollView>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Valg for ${selected.name}`}
            hitSlop={10}
            onPress={() => storageMenu(selected)}
          >
            <SymbolView name="ellipsis.circle" tintColor={t.tint} size={26} />
          </Pressable>
        </View>

        {/* Legg til: tekst, valgfri dato (kalender), skann */}
        <View style={[styles.addRow, shadow, { backgroundColor: t.card }]}>
          <TextInput
            accessibilityLabel={`Legg til vare i ${selected.name}`}
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={submit}
            placeholder={`Legg til i ${selected.name}`}
            placeholderTextColor={t.textSecondary}
            returnKeyType="done"
            autoCorrect={false}
            style={[styles.addInput, { color: t.text }]}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Utløpsdato (valgfritt)"
            hitSlop={8}
            onPress={() => setPickingFor('new')}
          >
            <SymbolView name="calendar" tintColor={expires ? t.tint : t.textSecondary} size={22} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Skann strekkode"
            hitSlop={8}
            onPress={() =>
              router.push({ pathname: '/scan', params: { target: 'stock', place: selected.id } })
            }
          >
            <SymbolView name="barcode.viewfinder" tintColor={t.textSecondary} size={24} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Legg til"
            onPress={submit}
            style={[styles.addBtn, { backgroundColor: t.tint }]}
          >
            <SymbolView name="plus" tintColor="#FFFFFF" size={16} />
          </Pressable>
        </View>
        {expires ? (
          <Pressable accessibilityRole="button" onPress={() => setExpires(null)}>
            <Text style={{ color: t.tint, fontSize: 13, fontWeight: '600' }}>
              Utløper {formatDateLabel(expires)} · trykk for å fjerne
            </Text>
          </Pressable>
        ) : null}

        {/* Går snart ut: én linje som kan utvides */}
        {soonItems.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => setShowSoon((v) => !v)}
            style={[styles.soon, { backgroundColor: t.tintSoft }]}
          >
            <Text style={{ color: t.tint, fontWeight: '700', fontSize: 14 }}>
              {soonItems.length} {soonItems.length === 1 ? 'vare går' : 'varer går'} snart ut{' '}
              {showSoon ? '▴' : '▾'}
            </Text>
            {showSoon
              ? soonItems.map((i) => (
                  <Text
                    key={i.id}
                    style={{
                      color: expiryState(i) === 'expired' ? t.danger : t.text,
                      fontSize: 14,
                    }}
                  >
                    {i.name} · {expiryLabel(i.expires!)}
                  </Text>
                ))
              : null}
          </Pressable>
        ) : null}

        {/* Varer */}
        <View style={styles.items}>
          {inStorage.length === 0 ? (
            <Text style={[styles.empty, { color: t.textSecondary }]}>Ingenting her ennå.</Text>
          ) : null}
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
                  <View style={styles.flex}>
                    <Text style={[styles.itemText, { color: t.text }]} numberOfLines={1}>
                      {item.name}
                    </Text>
                    {item.product ? (
                      <Text style={{ color: t.textSecondary, fontSize: 12 }} numberOfLines={1}>
                        {item.product}
                      </Text>
                    ) : null}
                  </View>
                  {item.expires ? (
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '700',
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
        </View>

        {/* Forslag: av/på rett i overskriften */}
        <View style={styles.sectionHead}>
          <Heading>Forslag fra lageret</Heading>
          <Switch
            value={settings.stockSuggestions}
            onValueChange={(v) => updateSettings({ stockSuggestions: v })}
            trackColor={{ true: t.tint }}
          />
        </View>
        {settings.stockSuggestions ? (
          <>
            <Pressable
              accessibilityRole="switch"
              accessibilityState={{ checked: fridge.assumeStaples }}
              accessibilityLabel="Anta at salt, pepper, vann og olje finnes"
              onPress={() => setAssumeStaples(!fridge.assumeStaples)}
              style={[styles.pill, { backgroundColor: fridge.assumeStaples ? t.tint : t.tintSoft }]}
            >
              <Text
                style={{
                  color: fridge.assumeStaples ? '#FFFFFF' : t.tint,
                  fontWeight: '600',
                  fontSize: 12,
                }}
              >
                {fridge.assumeStaples ? '✓ ' : ''}Salt, pepper, vann og olje finnes
              </Text>
            </Pressable>
            {recipes.length === 0 || fridge.items.length === 0 ? (
              <Text style={[styles.empty, { color: t.textSecondary }]}>
                {recipes.length === 0
                  ? 'Legg inn oppskrifter først.'
                  : 'Legg inn varer for å få forslag.'}
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
          title={pickingFor === 'new' ? 'Utløpsdato (valgfritt)' : `Dato for ${pickingFor.name}`}
          value={pickingFor === 'new' ? (expires ?? undefined) : pickingFor.expires}
          presets={EXPIRY_PRESETS}
          onCancel={() => setPickingFor(null)}
          onConfirm={(date) => {
            if (pickingFor === 'new') setExpires(date);
            else updateFridgeItem(pickingFor.id, { expires: date });
            setPickingFor(null);
          }}
          onClear={
            pickingFor === 'new'
              ? expires
                ? () => {
                    setExpires(null);
                    setPickingFor(null);
                  }
                : undefined
              : pickingFor.expires
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
  list: { paddingHorizontal: 20, paddingBottom: 40, gap: 10 },
  storageBar: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  storages: { gap: 8, paddingRight: 4 },
  storageChip: { borderRadius: 16, paddingHorizontal: 12, paddingVertical: 7 },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius,
    paddingLeft: 14,
    paddingRight: 8,
    paddingVertical: 6,
    gap: 12,
  },
  addInput: { flex: 1, fontSize: 16, paddingVertical: 8 },
  addBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  soon: { borderRadius: 12, padding: 10, gap: 4 },
  items: { gap: 6 },
  empty: { fontSize: 13 },
  item: {
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemText: { fontSize: 16 },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  pill: { alignSelf: 'flex-start', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5 },
});
