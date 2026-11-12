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
  View,
} from 'react-native';
import { AddRow, IconButton } from '@/components/AddRow';
import { DatePickerModal, formatDateLabel } from '@/components/DatePickerModal';
import { RecipeFitCard } from '@/components/RecipeFitCard';
import { SwipeRow } from '@/components/SwipeRow';
import { Heading, LargeTitle } from '@/components/ui';
import { t as tr } from '@/i18n';
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
import { radius, useTheme } from '@/theme/colors';

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
        settings.staples,
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
      tr('fridge.newStorage'),
      tr('fridge.newStorageHint'),
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
      tr('fridge.rename'),
      s.freezer ? tr('fridge.unmarkFreezer') : tr('fridge.markFreezer'),
      ...(n > 0 ? [tr('fridge.clearStorage', { name: s.name })] : []),
      tr('fridge.deleteStorage'),
      tr('fridge.cancel'),
    ];
    const deleteIndex = options.length - 2;
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: s.name,
        message: s.freezer ? tr('fridge.freezerNote') : undefined,
        options,
        cancelButtonIndex: options.length - 1,
        destructiveButtonIndex: deleteIndex,
      },
      (i) => {
        if (i === 0) {
          Alert.prompt(
            tr('fridge.rename'),
            undefined,
            (name) => name && updateStorage(s.id, { name }),
            'plain-text',
            s.name,
          );
        } else if (i === 1) updateStorage(s.id, { freezer: !s.freezer });
        else if (n > 0 && i === 2) {
          Alert.alert(tr('fridge.clearTitle', { name: s.name }), tr('fridge.clearMessage'), [
            { text: tr('fridge.cancel'), style: 'cancel' },
            { text: tr('fridge.clear'), style: 'destructive', onPress: () => clearFridge(s.id) },
          ]);
        } else if (i === deleteIndex) {
          if (storages.length <= 1) {
            Alert.alert(tr('fridge.cannotDelete'), tr('fridge.needOne'));
            return;
          }
          Alert.alert(
            tr('fridge.deleteTitle', { name: s.name }),
            n > 0 ? tr('fridge.deleteWithItems', { count: n }) : tr('fridge.deleteEmpty'),
            [
              { text: tr('fridge.cancel'), style: 'cancel' },
              {
                text: tr('fridge.delete'),
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
      tr('fridge.rename'),
      item.expires ? tr('fridge.changeDate') : tr('fridge.setDate'),
      ...others.map((s) => tr('fridge.moveTo', { name: s.name })),
      tr('fridge.cancel'),
    ];
    ActionSheetIOS.showActionSheetWithOptions(
      { title: item.name, message: item.product, options, cancelButtonIndex: options.length - 1 },
      (i) => {
        if (i === 0) {
          Alert.prompt(
            tr('fridge.rename'),
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
      <LargeTitle title={tr('fridge.title')} />
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
              accessibilityLabel={tr('fridge.newStorage')}
              onPress={newStorage}
              style={[styles.storageChip, { borderWidth: 1, borderColor: t.tint }]}
            >
              <Text style={{ color: t.tint, fontWeight: '700', fontSize: 14 }}>+</Text>
            </Pressable>
          </ScrollView>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={tr('fridge.optionsFor', { name: selected.name })}
            hitSlop={10}
            onPress={() => storageMenu(selected)}
          >
            <SymbolView name="ellipsis.circle" tintColor={t.tint} size={26} />
          </Pressable>
        </View>

        {/* Legg til: skriv + Enter. Valgfri dato og én skanneknapp. */}
        <AddRow
          value={draft}
          onChangeText={setDraft}
          onSubmit={submit}
          label={tr('fridge.addItemTo', { name: selected.name })}
          placeholder={tr('fridge.addTo', { name: selected.name })}
          onScan={() =>
            router.push({ pathname: '/scan', params: { target: 'stock', place: selected.id } })
          }
          extra={
            <IconButton
              name="calendar"
              label={tr('fridge.expiryOptional')}
              active={!!expires}
              onPress={() => setPickingFor('new')}
            />
          }
        />
        {expires ? (
          <Pressable accessibilityRole="button" onPress={() => setExpires(null)}>
            <Text style={{ color: t.tint, fontSize: 13, fontWeight: '600' }}>
              {tr('fridge.expiresTapToRemove', { date: formatDateLabel(expires) })}
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
              {tr('fridge.soon', { count: soonItems.length })} {showSoon ? '▴' : '▾'}
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
            <Text style={[styles.empty, { color: t.textSecondary }]}>
              {tr('fridge.nothingYet')}
            </Text>
          ) : null}
          {inStorage.map((item) => {
            const state = expiryState(item);
            return (
              <SwipeRow
                key={item.id}
                accessibilityLabel={item.name}
                right={{
                  label: tr('fridge.remove'),
                  color: t.danger,
                  run: () => removeFridgeItem(item.id),
                }}
                left={{ label: tr('fridge.options'), color: t.tint, run: () => itemMenu(item) }}
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
          <Heading>{tr('fridge.suggestionsFromStock')}</Heading>
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
              accessibilityLabel={tr('fridge.assumeStaplesLabel')}
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
                {fridge.assumeStaples ? '✓ ' : ''}
                {tr('fridge.staplesExist', { count: settings.staples.length })}
              </Text>
            </Pressable>
            {recipes.length === 0 || fridge.items.length === 0 ? (
              <Text style={[styles.empty, { color: t.textSecondary }]}>
                {recipes.length === 0
                  ? tr('fridge.addRecipesFirst')
                  : tr('fridge.addItemsForSuggestions')}
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
          title={
            pickingFor === 'new'
              ? tr('fridge.expiryOptional')
              : tr('fridge.dateFor', { name: pickingFor.name })
          }
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
  chipInner: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  countBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
