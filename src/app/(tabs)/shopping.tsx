import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useMemo, useState } from 'react';
import {
  ActionSheetIOS,
  Alert,
  Platform,
  Pressable,
  SectionList,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SwipeRow } from '@/components/SwipeRow';
import { Button, Chip, EmptyState, LargeTitle, SegmentedControl } from '@/components/ui';
import { departmentOf, orderFor, type Department } from '@/lib/departments';
import {
  baseServings,
  mergeIngredients,
  parseIngredient,
  type MergedItem,
} from '@/lib/ingredients';
import {
  addExtra,
  hideItem,
  removeCheckedExtras,
  removeExtra,
  removeRecipeFromShopping,
  resetShopping,
  restoreItem,
  setOverride,
  toggleChecked,
  toggleExtra,
  updateExtra,
  updateSettings,
  useStore,
} from '@/lib/store';
import { radius, shadow, useTheme } from '@/theme/colors';

type Row = {
  key: string;
  text: string;
  kind: 'merged' | 'extra' | 'done' | 'hidden';
  /** ID for egne varer. */
  id?: string;
  /** Har varen en egen redigert tekst? */
  edited?: boolean;
  /** Avdeling i butikken. */
  dept?: Department;
  onToggle: () => void;
};
type Section = { id: string; title: string; data: Row[]; collapsible?: boolean; count?: number };

const dateFmt = new Intl.DateTimeFormat('nb-NO', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

export default function ShoppingScreen() {
  const t = useTheme();
  const router = useRouter();
  const { recipes, plan, shopping, settings } = useStore();
  const [draft, setDraft] = useState('');
  const [from, setFrom] = useState(() => startOfDay(new Date()));
  const [to, setTo] = useState(() => addDays(startOfDay(new Date()), 6));

  const inRange = useMemo(
    () =>
      plan
        .filter((p) => {
          const d = new Date(p.date);
          return d >= startOfDay(from) && d <= endOfDay(to);
        })
        .sort((a, b) => a.date.localeCompare(b.date)),
    [plan, from, to],
  );

  const merged: MergedItem[] = useMemo(() => {
    const items = inRange.flatMap((entry) => {
      const recipe = recipes.find((r) => r.id === entry.recipeId);
      if (!recipe) return [];
      const factor = (entry.servings ?? baseServings(recipe)) / baseServings(recipe);
      return recipe.ingredients.map((line) => ({ parsed: parseIngredient(line), factor }));
    });
    // Oppskrifter lagt direkte på handlelisten tas med uansett datoperiode.
    const direct = shopping.fromRecipes.flatMap((add) => {
      const recipe = recipes.find((r) => r.id === add.recipeId);
      if (!recipe) return [];
      const factor = add.servings / baseServings(recipe);
      return recipe.ingredients.map((line) => ({ parsed: parseIngredient(line), factor }));
    });
    return mergeIngredients([...items, ...direct]);
  }, [inRange, recipes, shopping.fromRecipes]);

  const [doneOpen, setDoneOpen] = useState(false);
  const [hiddenOpen, setHiddenOpen] = useState(false);

  const mergedRows: Row[] = merged.map((m) => {
    const key = `m|${m.key}`;
    return {
      key,
      text: shopping.overrides[key] ?? m.text,
      kind: 'merged',
      edited: key in shopping.overrides,
      dept: departmentOf(m.key),
      onToggle: () => toggleChecked(key),
    };
  });
  const isHidden = (r: Row) => shopping.hidden.includes(r.key);
  const isDone = (r: Row) => shopping.checked.includes(r.key);
  const extraRows: Row[] = shopping.extras.map((e) => ({
    key: e.id,
    id: e.id,
    text: e.text,
    kind: 'extra',
    dept: departmentOf(e.text),
    onToggle: () => toggleExtra(e.id),
  }));

  const todoMerged = mergedRows.filter((r) => !isHidden(r) && !isDone(r));
  const todoExtras = extraRows.filter((r) => !shopping.extras.find((e) => e.id === r.id)?.checked);
  const doneRows: Row[] = [
    ...mergedRows.filter((r) => !isHidden(r) && isDone(r)),
    ...extraRows.filter((r) => shopping.extras.find((e) => e.id === r.id)?.checked),
  ].map((r) => ({ ...r, kind: 'done' as const }));
  const hiddenRows: Row[] = mergedRows
    .filter(isHidden)
    .map((r) => ({ ...r, kind: 'hidden' as const, onToggle: () => restoreItem(r.key) }));

  const sections: Section[] = [];
  if (settings.shoppingSort === 'department') {
    // Etter avdeling: i den rekkefølgen man går gjennom butikken.
    for (const dep of orderFor(settings.stores, settings.activeStoreId)) {
      const data = [...todoMerged, ...todoExtras]
        .filter((r) => r.dept === dep)
        .sort((a, b) => a.text.localeCompare(b.text, 'nb'));
      if (data.length > 0) sections.push({ id: `dept-${dep}`, title: dep, data });
    }
  } else {
    if (todoMerged.length > 0) {
      sections.push({ id: 'merged', title: 'Varer fra middagene', data: todoMerged });
    }
    if (todoExtras.length > 0) {
      sections.push({ id: 'extras', title: 'Egne varer', data: todoExtras });
    }
  }
  if (doneRows.length > 0) {
    sections.push({
      id: 'done',
      title: `Handlet (${doneRows.length})`,
      collapsible: true,
      count: doneRows.length,
      data: doneOpen ? doneRows : [],
    });
  }
  if (hiddenRows.length > 0) {
    sections.push({
      id: 'hidden',
      title: `Har fra før (${hiddenRows.length})`,
      collapsible: true,
      count: hiddenRows.length,
      data: hiddenOpen ? hiddenRows : [],
    });
  }

  const remaining = [...todoMerged, ...todoExtras];

  function editRow(row: Row) {
    const apply = (text?: string) => {
      if (text === undefined) return;
      if (row.kind === 'extra' && row.id) updateExtra(row.id, text);
      else setOverride(row.key, text);
    };
    if (Platform.OS === 'ios') {
      Alert.prompt('Rediger vare', undefined, apply, 'plain-text', row.text);
    }
  }

  /** Sveip mot høyre: egne varer slettes, varer fra middager flyttes til «Har fra før». */
  function removeRow(row: Row) {
    if (row.kind === 'extra' && row.id) removeExtra(row.id);
    else hideItem(row.key);
  }

  function showMenu(row: Row) {
    const edit = () => editRow(row);
    const actions: { label: string; destructive?: boolean; run: () => void }[] = [
      { label: 'Rediger', run: edit },
    ];
    if (row.kind === 'merged') {
      actions.push({ label: 'Har fra før – ta bort fra listen', run: () => hideItem(row.key) });
      if (row.edited)
        actions.push({ label: 'Tilbakestill tekst', run: () => setOverride(row.key, '') });
    } else if (row.id) {
      const id = row.id;
      actions.push({ label: 'Slett', destructive: true, run: () => removeExtra(id) });
    }
    const options = [...actions.map((a) => a.label), 'Avbryt'];
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: row.text,
          options,
          cancelButtonIndex: options.length - 1,
          destructiveButtonIndex:
            actions.findIndex((a) => a.destructive) >= 0
              ? actions.findIndex((a) => a.destructive)
              : undefined,
        },
        (i) => actions[i]?.run(),
      );
    }
  }

  function setRange(days: number) {
    const start = startOfDay(new Date());
    setFrom(start);
    setTo(addDays(start, days - 1));
  }

  function submit() {
    addExtra(draft);
    setDraft('');
  }

  function share() {
    const text = remaining.map((r) => `• ${r.text}`).join('\n');
    if (text) Share.share({ message: `Handleliste\n\n${text}` });
  }

  return (
    <View style={[styles.flex, { backgroundColor: t.background }]}>
      <LargeTitle
        title="Handleliste"
        actionIcon={remaining.length > 0 ? 'square.and.arrow.up' : undefined}
        actionLabel="Del handleliste"
        onAction={share}
      />
      <SectionList
        sections={sections}
        keyExtractor={(r) => r.key}
        stickySectionHeadersEnabled={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            <View style={[styles.rangeCard, shadow, { backgroundColor: t.card }]}>
              <View style={styles.rangeRow}>
                <Text style={[styles.rangeLabel, { color: t.text }]}>Fra</Text>
                <DateTimePicker
                  value={from}
                  mode="date"
                  display="compact"
                  accentColor={t.tint}
                  locale="nb-NO"
                  onChange={(_, d) => {
                    if (!d) return;
                    setFrom(startOfDay(d));
                    if (d > to) setTo(startOfDay(d));
                  }}
                />
              </View>
              <View style={styles.rangeRow}>
                <Text style={[styles.rangeLabel, { color: t.text }]}>Til</Text>
                <DateTimePicker
                  value={to}
                  mode="date"
                  display="compact"
                  accentColor={t.tint}
                  locale="nb-NO"
                  minimumDate={from}
                  onChange={(_, d) => d && setTo(startOfDay(d))}
                />
              </View>
              <View style={styles.quick}>
                {[
                  ['I dag', 1],
                  ['3 dager', 3],
                  ['7 dager', 7],
                  ['14 dager', 14],
                ].map(([label, days]) => (
                  <Pressable
                    key={label}
                    accessibilityRole="button"
                    onPress={() => setRange(days as number)}
                  >
                    <Chip>{label as string}</Chip>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.sortWrap}>
              <SegmentedControl
                value={settings.shoppingSort}
                onChange={(shoppingSort) => updateSettings({ shoppingSort })}
                options={[
                  { value: 'recipe', label: 'Alfabetisk' },
                  { value: 'department', label: 'Etter avdeling' },
                ]}
              />
            </View>
            {settings.shoppingSort === 'department' ? (
              <View style={styles.storeRow}>
                <Text style={[styles.hint, { color: t.textSecondary }]}>Butikk:</Text>
                {[{ id: null as string | null, name: 'Standard' }, ...settings.stores].map((st) => (
                  <Pressable
                    key={st.id ?? 'std'}
                    accessibilityRole="button"
                    accessibilityState={{ selected: settings.activeStoreId === st.id }}
                    onPress={() => updateSettings({ activeStoreId: st.id })}
                  >
                    <View
                      style={[
                        styles.storeChip,
                        { backgroundColor: settings.activeStoreId === st.id ? t.tint : t.tintSoft },
                      ]}
                    >
                      <Text
                        style={{
                          color: settings.activeStoreId === st.id ? '#FFFFFF' : t.tint,
                          fontWeight: '600',
                          fontSize: 13,
                        }}
                      >
                        {st.name}
                      </Text>
                    </View>
                  </Pressable>
                ))}
                <Pressable accessibilityRole="button" onPress={() => router.push('/stores')}>
                  <Text style={{ color: t.tint, fontWeight: '700', fontSize: 13 }}>
                    Rediger butikker
                  </Text>
                </Pressable>
              </View>
            ) : null}
            <Text style={[styles.summary, { color: t.textSecondary }]}>
              {inRange.length === 0
                ? `Ingen middager ${dateFmt.format(from)} – ${dateFmt.format(to)}`
                : `${inRange.length} ${inRange.length === 1 ? 'middag' : 'middager'} · ${dateFmt.format(from)} – ${dateFmt.format(to)}`}
            </Text>
            {inRange.map((e) => {
              const r = recipes.find((x) => x.id === e.recipeId);
              if (!r) return null;
              return (
                <Text key={e.id} style={[styles.summaryItem, { color: t.textSecondary }]}>
                  {dateFmt.format(new Date(e.date))}: {r.title} ({e.servings ?? baseServings(r)}{' '}
                  porsj.)
                </Text>
              );
            })}

            {shopping.fromRecipes.map((add) => {
              const r = recipes.find((x) => x.id === add.recipeId);
              if (!r) return null;
              return (
                <View key={add.id} style={styles.addedRow}>
                  <Text style={[styles.summaryItem, styles.flex, { color: t.textSecondary }]}>
                    Lagt til: {r.title} ({add.servings} porsj.)
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Fjern ${r.title} fra handlelisten`}
                    onPress={() => removeRecipeFromShopping(add.id)}
                  >
                    <Text style={{ color: t.danger, fontWeight: '700', fontSize: 13 }}>Fjern</Text>
                  </Pressable>
                </View>
              );
            })}

            {todoMerged.length + todoExtras.length > 0 ? (
              <Text style={[styles.hint, { color: t.textSecondary }]}>
                Sveip mot høyre for å fjerne · mot venstre for å redigere
              </Text>
            ) : null}
            <View style={[styles.addRow, shadow, { backgroundColor: t.card }]}>
              <TextInput
                accessibilityLabel="Legg til vare"
                value={draft}
                onChangeText={setDraft}
                onSubmitEditing={submit}
                placeholder="Legg til egen vare …"
                placeholderTextColor={t.textSecondary}
                returnKeyType="done"
                style={[styles.addInput, { color: t.text }]}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Skann strekkode"
                hitSlop={8}
                onPress={() => router.push({ pathname: '/scan', params: { target: 'shopping' } })}
              >
                <Text style={{ fontSize: 22 }}>📷</Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Legg til" onPress={submit}>
                <SymbolView name="plus.circle.fill" tintColor={t.tint} size={28} />
              </Pressable>
            </View>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            emoji="🛒"
            title="Handlelisten er tom"
            text="Velg en periode med planlagte middager, så samles og slås ingrediensene sammen her."
          />
        }
        ListFooterComponent={
          doneRows.length > 0 ? (
            <View style={styles.footer}>
              <Button title="Angre alle avkrysninger" kind="secondary" onPress={resetShopping} />
              {extraRows.some((r) => shopping.extras.find((e) => e.id === r.id)?.checked) ? (
                <Button
                  title="Fjern handlede egne varer"
                  kind="destructive"
                  onPress={removeCheckedExtras}
                />
              ) : null}
            </View>
          ) : undefined
        }
        renderSectionHeader={({ section }) =>
          section.collapsible ? (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: section.data.length > 0 }}
              onPress={() =>
                section.id === 'done' ? setDoneOpen((o) => !o) : setHiddenOpen((o) => !o)
              }
              style={styles.collapseHeader}
            >
              <SymbolView
                name={section.data.length > 0 ? 'chevron.down' : 'chevron.right'}
                tintColor={t.textSecondary}
                size={14}
              />
              <Text style={[styles.header, styles.collapseTitle, { color: t.textSecondary }]}>
                {section.title}
              </Text>
            </Pressable>
          ) : (
            <Text style={[styles.header, { color: t.textSecondary }]}>{section.title}</Text>
          )
        }
        renderItem={({ item }) => {
          if (item.kind === 'done' || item.kind === 'hidden') {
            // Her kan man bare angre via en tydelig knapp – ingen utilsiktede trykk på raden.
            return (
              <View
                style={[
                  styles.row,
                  styles.doneRow,
                  { backgroundColor: t.card, borderColor: t.border },
                ]}
              >
                <Text
                  style={[
                    styles.rowText,
                    { color: t.textSecondary },
                    item.kind === 'done' && { textDecorationLine: 'line-through' },
                  ]}
                >
                  {item.text}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${item.kind === 'done' ? 'Angre' : 'Legg tilbake'}: ${item.text}`}
                  onPress={item.onToggle}
                  style={[styles.undo, { backgroundColor: t.tintSoft }]}
                >
                  <Text style={[styles.undoText, { color: t.tint }]}>
                    {item.kind === 'done' ? 'Angre' : 'Legg tilbake'}
                  </Text>
                </Pressable>
              </View>
            );
          }
          return (
            <SwipeRow
              accessibilityLabel={item.text}
              right={{
                label: item.kind === 'extra' ? 'Slett' : 'Har fra før',
                color: t.danger,
                run: () => removeRow(item),
              }}
              left={{ label: 'Rediger', color: t.tint, run: () => editRow(item) }}
            >
              <View style={[styles.row, { backgroundColor: t.card, borderColor: t.border }]}>
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: false }}
                  accessibilityLabel={item.text}
                  onPress={item.onToggle}
                  style={styles.rowMain}
                >
                  <SymbolView name="circle" tintColor={t.textSecondary} size={24} />
                  <Text style={[styles.rowText, { color: t.text }]}>{item.text}</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Flere valg for ${item.text}`}
                  hitSlop={10}
                  onPress={() => showMenu(item)}
                >
                  <SymbolView name="ellipsis.circle" tintColor={t.textSecondary} size={24} />
                </Pressable>
              </View>
            </SwipeRow>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { paddingHorizontal: 20, paddingBottom: 40, gap: 6, flexGrow: 1 },
  headerBlock: { gap: 8, marginBottom: 4 },
  rangeCard: { borderRadius: radius, padding: 16, gap: 8 },
  rangeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rangeLabel: { fontSize: 16, fontWeight: '600' },
  quick: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  hint: { fontSize: 12 },
  sortWrap: { marginHorizontal: -20, marginBottom: -4 },
  summary: { fontSize: 14, fontWeight: '700', marginTop: 4 },
  storeRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  storeChip: { borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5 },
  addedRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  summaryItem: { fontSize: 13 },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius,
    paddingLeft: 16,
    paddingRight: 12,
    marginTop: 4,
  },
  addInput: { flex: 1, fontSize: 16, paddingVertical: 14 },
  header: { fontSize: 14, fontWeight: '700', marginTop: 14, marginBottom: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  rowText: { flex: 1, fontSize: 16, lineHeight: 22 },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  doneRow: { opacity: 0.85 },
  undo: { borderRadius: 14, paddingHorizontal: 12, paddingVertical: 7 },
  undoText: { fontSize: 14, fontWeight: '700' },
  collapseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
    marginBottom: 4,
  },
  collapseTitle: { marginTop: 0, marginBottom: 0 },
  footer: { gap: 8, marginTop: 16 },
});
