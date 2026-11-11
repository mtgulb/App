import DateTimePicker from '@react-native-community/datetimepicker';
import { SymbolView } from 'expo-symbols';
import { useMemo, useState } from 'react';
import { Pressable, SectionList, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, Chip, EmptyState, LargeTitle } from '@/components/ui';
import {
  baseServings,
  mergeIngredients,
  parseIngredient,
  type MergedItem,
} from '@/lib/ingredients';
import {
  addExtra,
  removeExtra,
  resetShopping,
  toggleChecked,
  toggleExtra,
  useStore,
} from '@/lib/store';
import { radius, shadow, useTheme } from '@/theme/colors';

type Row = {
  key: string;
  text: string;
  checked: boolean;
  onToggle: () => void;
  onLongPress?: () => void;
};
type Section = { title: string; data: Row[] };

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
  const { recipes, plan, shopping } = useStore();
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
    return mergeIngredients(items);
  }, [inRange, recipes]);

  const sections: Section[] = [];
  if (merged.length > 0) {
    sections.push({
      title: 'Varer fra middagene',
      data: merged.map((m) => {
        const key = `m|${m.key}`;
        return {
          key,
          text: m.text,
          checked: shopping.checked.includes(key),
          onToggle: () => toggleChecked(key),
        };
      }),
    });
  }
  if (shopping.extras.length > 0) {
    sections.push({
      title: 'Egne varer',
      data: shopping.extras.map((e) => ({
        key: e.id,
        text: e.text,
        checked: e.checked,
        onToggle: () => toggleExtra(e.id),
        onLongPress: () => removeExtra(e.id),
      })),
    });
  }

  const remaining = sections.flatMap((s) => s.data).filter((r) => !r.checked);

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
          sections.length > 0 ? (
            <View style={{ marginTop: 16 }}>
              <Button title="Nullstill avkrysning" kind="secondary" onPress={resetShopping} />
            </View>
          ) : undefined
        }
        renderSectionHeader={({ section }) => (
          <Text style={[styles.header, { color: t.textSecondary }]}>{section.title}</Text>
        )}
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: item.checked }}
            onPress={item.onToggle}
            onLongPress={item.onLongPress}
            style={[styles.row, { backgroundColor: t.card, borderColor: t.border }]}
          >
            <SymbolView
              name={item.checked ? 'checkmark.circle.fill' : 'circle'}
              tintColor={item.checked ? t.tint : t.textSecondary}
              size={24}
            />
            <Text
              style={[
                styles.rowText,
                { color: item.checked ? t.textSecondary : t.text },
                item.checked && { textDecorationLine: 'line-through' },
              ]}
            >
              {item.text}
            </Text>
          </Pressable>
        )}
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
  summary: { fontSize: 14, fontWeight: '700', marginTop: 4 },
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
});
