import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, SectionList, StyleSheet, Text, View } from 'react-native';
import { t, dateTag } from '@/i18n';
import { CalendarMonth, dayKey } from '@/components/CalendarMonth';
import { EmptyState, LargeTitle, SegmentedControl, Stepper } from '@/components/ui';
import { removeDinnerEvent, updateDinnerEvent } from '@/lib/calendar';
import { baseServings } from '@/lib/ingredients';
import {
  addRecipeToShopping,
  getRecipe,
  removePlanEntry,
  setEntryServings,
  useStore,
} from '@/lib/store';
import type { MealPlanEntry } from '@/lib/types';
import { radius, shadow, useTheme } from '@/theme/colors';

const dayFmt = (): Intl.DateTimeFormat =>
  new Intl.DateTimeFormat(dateTag(), { weekday: 'long', day: 'numeric', month: 'long' });
const timeFmt = (): Intl.DateTimeFormat =>
  new Intl.DateTimeFormat(dateTag(), { hour: '2-digit', minute: '2-digit' });

type View_ = 'list' | 'calendar';

function PlanRow({ item }: { item: MealPlanEntry }) {
  const c = useTheme();
  const router = useRouter();
  const recipe = getRecipe(item.recipeId);
  const servings = item.servings ?? (recipe ? baseServings(recipe) : 4);

  function confirmRemove() {
    Alert.alert(t('plan.removeTitle'), t('plan.removeMessage'), [
      { text: t('plan.cancel'), style: 'cancel' },
      {
        text: t('plan.remove'),
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
      if (!ok) Alert.alert(t('plan.calendarAlertTitle'), t('plan.calendarUpdateFailed'));
    }
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('plan.rowA11y', { title: recipe?.title ?? t('plan.dinner') })}
      onPress={() => recipe && router.push({ pathname: '/recipe/[id]', params: { id: recipe.id } })}
      onLongPress={confirmRemove}
      style={({ pressed }) => [
        styles.row,
        shadow,
        { backgroundColor: c.card, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <View style={[styles.time, { backgroundColor: c.tintSoft }]}>
        <Text style={[styles.timeText, { color: c.tint }]}>
          {timeFmt().format(new Date(item.date))}
        </Text>
      </View>
      <View style={styles.flex}>
        <Text style={[styles.title, { color: c.text }]} numberOfLines={2}>
          {recipe?.title ?? t('plan.deletedRecipe')}
        </Text>
        <Text style={{ color: c.textSecondary }}>
          {item.calendarEventId ? t('plan.inCalendar') : t('plan.onlyInPlan')} ·{' '}
          {t('plan.servingsSuffix')}
        </Text>
      </View>
      {recipe ? (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('plan.addToShoppingA11y')}
            hitSlop={8}
            onPress={() => {
              const n = addRecipeToShopping(recipe.id, servings);
              Alert.alert(
                t('plan.addedTitle'),
                n > 1 ? t('plan.addedMany', { count: n }) : t('plan.addedOne', { servings }),
              );
            }}
          >
            <SymbolView name="cart.badge.plus" tintColor={c.tint} size={24} />
          </Pressable>
          <Stepper
            compact
            value={servings}
            onChange={changeServings}
            label={t('plan.servingsSuffix')}
          />
        </>
      ) : null}
    </Pressable>
  );
}

export default function PlanScreen() {
  const c = useTheme();
  const { plan } = useStore();
  const [view, setView] = useState<View_>('list');
  const [month, setMonth] = useState(() => new Date());
  const [selected, setSelected] = useState(() => dayKey(new Date()));

  const sorted = [...plan].sort((a, b) => a.date.localeCompare(b.date));

  // Listevisning: gruppert per dag
  const groups = new Map<string, MealPlanEntry[]>();
  for (const e of sorted) {
    const key = dayFmt().format(new Date(e.date));
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
  const selectedLabel = dayFmt().format(new Date(sy, sm - 1, sd));

  function changeMonth(delta: number) {
    setMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));
  }

  return (
    <View style={[styles.flex, { backgroundColor: c.background }]}>
      <LargeTitle title={t('plan.title')} />
      <SegmentedControl
        value={view}
        onChange={setView}
        options={[
          { value: 'list', label: t('plan.viewList') },
          { value: 'calendar', label: t('plan.viewCalendar') },
        ]}
      />
      {view === 'list' ? (
        <SectionList
          sections={sections}
          keyExtractor={(e) => e.id}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <EmptyState emoji="🗓️" title={t('plan.emptyTitle')} text={t('plan.emptyText')} />
          }
          renderSectionHeader={({ section }) => (
            <Text style={[styles.header, { color: c.textSecondary }]}>{section.title}</Text>
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
          <Text style={[styles.header, { color: c.textSecondary }]}>{selectedLabel}</Text>
          {dayEntries.length === 0 ? (
            <Text style={{ color: c.textSecondary }}>{t('plan.noDinnerThisDay')}</Text>
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
