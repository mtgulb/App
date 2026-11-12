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
  View,
} from 'react-native';
import { t as tr, dateTag } from '@/i18n';
import { AddRow } from '@/components/AddRow';
import { SwipeRow } from '@/components/SwipeRow';
import { Button, EmptyState, LargeTitle, SegmentedControl, Stepper } from '@/components/ui';
import { departmentOf, orderFor, type Department } from '@/lib/departments';
import { type MergedItem } from '@/lib/ingredients';
import { mergedFromRecipes } from '@/lib/shoppingList';
import {
  addExtra,
  clearShopping,
  hideItem,
  removeCheckedExtras,
  removeExtra,
  removeRecipeFromShopping,
  resetShopping,
  restoreItem,
  setOverride,
  setShoppingServings,
  toggleChecked,
  toggleExtra,
  updateExtra,
  updateSettings,
  useStore,
} from '@/lib/store';
import { radius, useTheme } from '@/theme/colors';

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

export default function ShoppingScreen() {
  const t = useTheme();
  const router = useRouter();
  const { recipes, shopping, settings } = useStore();
  const [draft, setDraft] = useState('');
  const [showPlan, setShowPlan] = useState(false);

  // Handlelisten fylles bare manuelt: oppskrifter du har lagt på listen, pluss egne varer.
  const merged: MergedItem[] = useMemo(
    () => mergedFromRecipes(shopping.fromRecipes, recipes),
    [recipes, shopping.fromRecipes],
  );

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
        .sort((a, b) => a.text.localeCompare(b.text, dateTag()));
      if (data.length > 0) sections.push({ id: `dept-${dep}`, title: dep, data });
    }
  } else {
    if (todoMerged.length > 0) {
      sections.push({ id: 'merged', title: tr('shopping.sectionFromRecipes'), data: todoMerged });
    }
    if (todoExtras.length > 0) {
      sections.push({ id: 'extras', title: tr('shopping.sectionExtras'), data: todoExtras });
    }
  }
  if (doneRows.length > 0) {
    sections.push({
      id: 'done',
      title: tr('shopping.sectionDone', { count: doneRows.length }),
      collapsible: true,
      count: doneRows.length,
      data: doneOpen ? doneRows : [],
    });
  }
  if (hiddenRows.length > 0) {
    sections.push({
      id: 'hidden',
      title: tr('shopping.sectionHidden', { count: hiddenRows.length }),
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
      Alert.prompt(tr('shopping.editItem'), undefined, apply, 'plain-text', row.text);
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
      { label: tr('shopping.edit'), run: edit },
    ];
    if (row.kind === 'merged') {
      actions.push({ label: tr('shopping.haveAlreadyAction'), run: () => hideItem(row.key) });
      if (row.edited)
        actions.push({ label: tr('shopping.resetText'), run: () => setOverride(row.key, '') });
    } else if (row.id) {
      const id = row.id;
      actions.push({ label: tr('shopping.delete'), destructive: true, run: () => removeExtra(id) });
    }
    const options = [...actions.map((a) => a.label), tr('shopping.cancel')];
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

  function confirmClear() {
    Alert.alert(tr('shopping.clearTitle'), tr('shopping.clearMessage'), [
      { text: tr('shopping.cancel'), style: 'cancel' },
      { text: tr('shopping.clearConfirm'), style: 'destructive', onPress: clearShopping },
    ]);
  }

  function submit() {
    addExtra(draft);
    setDraft('');
  }

  function share() {
    const text = remaining.map((r) => `• ${r.text}`).join('\n');
    if (text) Share.share({ message: `${tr('shopping.shareHeading')}\n\n${text}` });
  }

  return (
    <View style={[styles.flex, { backgroundColor: t.background }]}>
      <LargeTitle
        title={tr('shopping.title')}
        actionIcon={remaining.length > 0 ? 'square.and.arrow.up' : undefined}
        actionLabel={tr('shopping.share')}
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
            {/* Skriv + Enter, eller skann */}
            <AddRow
              value={draft}
              onChangeText={setDraft}
              onSubmit={submit}
              label={tr('shopping.addItem')}
              placeholder={tr('shopping.addItem')}
              onScan={() => router.push({ pathname: '/scan', params: { target: 'shopping' } })}
            />

            {/* Én linje: hvilke oppskrifter som er lagt til, og sortering. Utvides ved trykk. */}
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: showPlan }}
              onPress={() => setShowPlan((v) => !v)}
              style={[styles.summaryBar, { backgroundColor: t.card, borderColor: t.border }]}
            >
              <Text style={[styles.summaryTitle, { color: t.text }]} numberOfLines={1}>
                {shopping.fromRecipes.length === 0
                  ? tr('shopping.noRecipes')
                  : tr('shopping.recipes', { count: shopping.fromRecipes.length })}
              </Text>
              <Text style={{ color: t.textSecondary, fontSize: 13 }}>
                {settings.shoppingSort === 'department'
                  ? tr('shopping.sortDepartment')
                  : tr('shopping.sortAlphabetical')}{' '}
                {showPlan ? '▴' : '▾'}
              </Text>
            </Pressable>

            {showPlan ? (
              <View style={[styles.panel, { backgroundColor: t.card, borderColor: t.border }]}>
                {shopping.fromRecipes.map((add) => {
                  const r = recipes.find((x) => x.id === add.recipeId);
                  if (!r) return null;
                  return (
                    <View key={add.id} style={styles.addedRow}>
                      <Text
                        style={[styles.summaryItem, styles.flex, { color: t.text }]}
                        numberOfLines={1}
                      >
                        {r.title}
                      </Text>
                      <Stepper
                        compact
                        value={add.servings}
                        label={tr('shopping.servings')}
                        onChange={(n) => setShoppingServings(add.id, n)}
                      />
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={tr('shopping.removeRecipeLabel', { title: r.title })}
                        hitSlop={8}
                        onPress={() => removeRecipeFromShopping(add.id)}
                      >
                        <Text style={{ color: t.danger, fontWeight: '700', fontSize: 13 }}>
                          {tr('shopping.remove')}
                        </Text>
                      </Pressable>
                    </View>
                  );
                })}
                {shopping.fromRecipes.length === 0 ? (
                  <Text style={[styles.summaryItem, { color: t.textSecondary }]}>
                    {tr('shopping.addRecipeHint')}
                  </Text>
                ) : null}

                <View style={styles.sortWrap}>
                  <SegmentedControl
                    value={settings.shoppingSort}
                    onChange={(shoppingSort) => updateSettings({ shoppingSort })}
                    options={[
                      { value: 'recipe', label: tr('shopping.sortAlphabetical') },
                      { value: 'department', label: tr('shopping.sortDepartment') },
                    ]}
                  />
                </View>
                {settings.shoppingSort === 'department' ? (
                  <View style={styles.storeRow}>
                    <Text style={[styles.hint, { color: t.textSecondary }]}>
                      {tr('shopping.store')}
                    </Text>
                    {[
                      { id: null as string | null, name: tr('shopping.defaultStore') },
                      ...settings.stores,
                    ].map((st) => (
                      <Pressable
                        key={st.id ?? 'std'}
                        accessibilityRole="button"
                        accessibilityState={{ selected: settings.activeStoreId === st.id }}
                        onPress={() => updateSettings({ activeStoreId: st.id })}
                      >
                        <View
                          style={[
                            styles.storeChip,
                            {
                              backgroundColor:
                                settings.activeStoreId === st.id ? t.tint : t.tintSoft,
                            },
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
                        {tr('shopping.editStores')}
                      </Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            emoji="🛒"
            title={tr('shopping.emptyTitle')}
            text={tr('shopping.emptyText')}
          />
        }
        ListFooterComponent={
          doneRows.length > 0 || sections.length > 0 || shopping.fromRecipes.length > 0 ? (
            <View style={styles.footer}>
              {doneRows.length > 0 ? (
                <Button title={tr('shopping.undoAll')} kind="secondary" onPress={resetShopping} />
              ) : null}
              {extraRows.some((r) => shopping.extras.find((e) => e.id === r.id)?.checked) ? (
                <Button
                  title={tr('shopping.removeBoughtExtras')}
                  kind="secondary"
                  onPress={removeCheckedExtras}
                />
              ) : null}
              <Button title={tr('shopping.clear')} kind="destructive" onPress={confirmClear} />
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
                  accessibilityLabel={
                    item.kind === 'done'
                      ? tr('shopping.undoLabel', { text: item.text })
                      : tr('shopping.putBackLabel', { text: item.text })
                  }
                  onPress={item.onToggle}
                  style={[styles.undo, { backgroundColor: t.tintSoft }]}
                >
                  <Text style={[styles.undoText, { color: t.tint }]}>
                    {item.kind === 'done' ? tr('shopping.undo') : tr('shopping.putBack')}
                  </Text>
                </Pressable>
              </View>
            );
          }
          return (
            <SwipeRow
              accessibilityLabel={item.text}
              right={{
                label: item.kind === 'extra' ? tr('shopping.delete') : tr('shopping.haveAlready'),
                color: t.danger,
                run: () => removeRow(item),
              }}
              left={{ label: tr('shopping.edit'), color: t.tint, run: () => editRow(item) }}
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
                  accessibilityLabel={tr('shopping.moreOptions', { text: item.text })}
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
  hint: { fontSize: 12 },
  sortWrap: { marginHorizontal: -20, marginBottom: -4 },
  storeRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  storeChip: { borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5 },
  summaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  summaryTitle: { flex: 1, fontSize: 14, fontWeight: '600' },
  panel: { borderRadius: radius, borderWidth: 1, padding: 12, gap: 10 },
  addedRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  summaryItem: { fontSize: 13 },
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
