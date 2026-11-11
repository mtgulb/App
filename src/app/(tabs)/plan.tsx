import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, SectionList, StyleSheet, Text, View } from 'react-native';
import { CalendarMonth, dayKey } from '@/components/CalendarMonth';
import { EmptyState, LargeTitle, SegmentedControl, Stepper } from '@/components/ui';
import { removeDinnerEvent, updateDinnerEvent } from '@/lib/calendar';
import { baseServings } from '@/lib/ingredients';
import { getRecipe, removePlanEntry, setEntryServings, useStore } from '@/lib/store';
import type { MealPlanEntry } from '@/lib/types';
import { radius, shadow, useTheme } from '@/theme/colors';

const dayFmt = new Intl.DateTimeFormat('nb-NO', { weekday: 'long', day: 'numeric', month: 'long' });
const timeFmt = new Intl.DateTimeFormat('nb-NO', { hour: '2-digit', minute: '2-digit' });

type View_ = 'list' | 'calendar';

function PlanRow({ item }: { item: MealPlanEntry }) {
  const t = useTheme();
  const router = useRouter();
  const recipe = getRecipe(item.recipeId);
  const servings = item.servings ?? (recipe ? baseServings(recipe) : 4);

  function confirmRemove() {
    Alert.alert('Fjerne middagen?', 'Den fjernes også fra kalenderen din.', [
      { text: 'Avbryt', style: 'cancel' },
      {
        text: 'Fjern',
        style: 'destructive',
        onPress: async () => {
          if (item.calendarEventId) await removeDinnerEvent(item.calendarEventId);
          removePlanEntry(item.id);
        },
      },
    ]);
  }

  async function changeServings(n: number) {
    setEntryServings(item.id, n);
    if (item.calendarEventId && recipe) {
      const ok = await updateDinnerEvent(item.calendarEventId, recipe, n);
      if (!ok) Alert.alert('Kalender', 'Kunne ikke oppdatere ingrediensene i kalenderhendelsen.');
    }
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${recipe?.title ?? 'Middag'}, trykk for oppskrift, hold inne for å fjerne`}
      onPress={() => recipe && router.push({ pathname: '/recipe/[id]', params: { id: recipe.id } })}
      onLongPress={confirmRemove}
      style={({ pressed }) => [
        styles.row,
        shadow,
        { backgroundColor: t.card, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <View style={[styles.time, { backgroundColor: t.tintSoft }]}>
        <Text style={[styles.timeText, { color: t.tint }]}>
          {timeFmt.format(new Date(item.date))}
        </Text>
      </View>
      <View style={styles.flex}>
        <Text style={[styles.title, { color: t.text }]} numberOfLines={2}>
          {recipe?.title ?? 'Slettet oppskrift'}
        </Text>
        <Text style={{ color: t.textSecondary }}>
          {item.calendarEventId ? 'I kalenderen' : 'Bare i planen'} · porsjoner
        </Text>
      </View>
      {recipe ? (
        <Stepper compact value={servings} onChange={changeServings} label="porsjoner" />
      ) : null}
    </Pressable>
  );
}

export default function PlanScreen() {
  const t = useTheme();
  const { plan } = useStore();
  const [view, setView] = useState<View_>('list');
  const [month, setMonth] = useState(() => new Date());
  const [selected, setSelected] = useState(() => dayKey(new Date()));

  const sorted = [...plan].sort((a, b) => a.date.localeCompare(b.date));

  // Listevisning: gruppert per dag
  const groups = new Map<string, MealPlanEntry[]>();
  for (const e of sorted) {
    const key = dayFmt.format(new Date(e.date));
    groups.set(key, [...(groups.get(key) ?? []), e]);
  }
  const sections = [...groups].map(([title, data]) => ({ title, data }));

  // Kalendervisning: antall middager per dag
  const marked = new Map<string, number>();
  for (const e of sorted) {
    const k = dayKey(new Date(e.date));
    marked.set(k, (marked.get(k) ?? 0) + 1);
  }
  const dayEntries = sorted.filter((e) => dayKey(new Date(e.date)) === selected);
  const [sy, sm, sd] = selected.split('-').map(Number);
  const selectedLabel = dayFmt.format(new Date(sy, sm - 1, sd));

  function changeMonth(delta: number) {
    setMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));
  }

  return (
    <View style={[styles.flex, { backgroundColor: t.background }]}>
      <LargeTitle title="Middagsplan" />
      <SegmentedControl
        value={view}
        onChange={setView}
        options={[
          { value: 'list', label: 'Liste' },
          { value: 'calendar', label: 'Kalender' },
        ]}
      />
      {view === 'list' ? (
        <SectionList
          sections={sections}
          keyExtractor={(e) => e.id}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <EmptyState
              emoji="🗓️"
              title="Ingen planlagte middager"
              text="Åpne en oppskrift og velg «Planlegg middag» for å legge den i kalenderen."
            />
          }
          renderSectionHeader={({ section }) => (
            <Text style={[styles.header, { color: t.textSecondary }]}>{section.title}</Text>
          )}
          renderItem={({ item }) => <PlanRow item={item} />}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          <CalendarMonth
            month={month}
            selected={selected}
            marked={marked}
            onSelect={setSelected}
            onMonthChange={changeMonth}
          />
          <Text style={[styles.header, { color: t.textSecondary }]}>{selectedLabel}</Text>
          {dayEntries.length === 0 ? (
            <Text style={{ color: t.textSecondary }}>Ingen middag planlagt denne dagen.</Text>
          ) : (
            dayEntries.map((e) => <PlanRow key={e.id} item={e} />)
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { paddingHorizontal: 20, paddingBottom: 32, gap: 10, flexGrow: 1 },
  header: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'capitalize',
    marginTop: 12,
    marginBottom: 2,
  },
  row: { borderRadius: radius, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  time: { borderRadius: 14, paddingHorizontal: 10, paddingVertical: 10 },
  timeText: { fontSize: 15, fontWeight: '700' },
  title: { fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },
});
