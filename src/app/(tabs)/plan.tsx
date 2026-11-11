import { useRouter } from 'expo-router';
import { Alert, Pressable, SectionList, StyleSheet, Text, View } from 'react-native';
import { EmptyState, LargeTitle } from '@/components/ui';
import { removeDinnerEvent } from '@/lib/calendar';
import { getRecipe, removePlanEntry, useStore } from '@/lib/store';
import type { MealPlanEntry } from '@/lib/types';
import { radius, shadow, useTheme } from '@/theme/colors';

const dayFmt = new Intl.DateTimeFormat('nb-NO', { weekday: 'long', day: 'numeric', month: 'long' });
const timeFmt = new Intl.DateTimeFormat('nb-NO', { hour: '2-digit', minute: '2-digit' });

export default function PlanScreen() {
  const t = useTheme();
  const router = useRouter();
  const { plan } = useStore();

  const sorted = [...plan].sort((a, b) => a.date.localeCompare(b.date));
  const groups = new Map<string, MealPlanEntry[]>();
  for (const e of sorted) {
    const key = dayFmt.format(new Date(e.date));
    groups.set(key, [...(groups.get(key) ?? []), e]);
  }
  const sections = [...groups].map(([title, data]) => ({ title, data }));

  function confirmRemove(e: MealPlanEntry) {
    Alert.alert('Fjerne middagen?', 'Den fjernes også fra kalenderen din.', [
      { text: 'Avbryt', style: 'cancel' },
      {
        text: 'Fjern',
        style: 'destructive',
        onPress: async () => {
          if (e.calendarEventId) await removeDinnerEvent(e.calendarEventId);
          removePlanEntry(e.id);
        },
      },
    ]);
  }

  return (
    <View style={[styles.flex, { backgroundColor: t.background }]}>
      <LargeTitle title="Middagsplan" />
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
        renderItem={({ item }) => {
          const recipe = getRecipe(item.recipeId);
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${recipe?.title ?? 'Middag'}, trykk for oppskrift, hold inne for å fjerne`}
              onPress={() =>
                recipe && router.push({ pathname: '/recipe/[id]', params: { id: recipe.id } })
              }
              onLongPress={() => confirmRemove(item)}
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
                <Text style={[styles.title, { color: t.text }]}>
                  {recipe?.title ?? 'Slettet oppskrift'}
                </Text>
                <Text style={{ color: t.textSecondary }}>
                  {item.calendarEventId ? 'I kalenderen' : 'Bare i planen'} · hold inne for å fjerne
                </Text>
              </View>
            </Pressable>
          );
        }}
      />
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
  row: { borderRadius: radius, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 14 },
  time: { borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10 },
  timeText: { fontSize: 16, fontWeight: '700' },
  title: { fontSize: 17, fontWeight: '700', letterSpacing: -0.2 },
});
