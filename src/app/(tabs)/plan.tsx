import { useRouter } from 'expo-router';
import { Alert, Pressable, SectionList, StyleSheet, Text, View } from 'react-native';
import { EmptyState } from '@/components/ui';
import { removeDinnerEvent } from '@/lib/calendar';
import { getRecipe, removePlanEntry, useStore } from '@/lib/store';
import type { MealPlanEntry } from '@/lib/types';
import { radius, useTheme } from '@/theme/colors';

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
    <SectionList
      style={{ backgroundColor: t.background }}
      contentContainerStyle={styles.list}
      contentInsetAdjustmentBehavior="automatic"
      sections={sections}
      keyExtractor={(e) => e.id}
      ListEmptyComponent={
        <EmptyState
          title="Ingen planlagte middager"
          text="Åpne en oppskrift og velg «Planlegg middag» for å legge den i kalenderen."
        />
      }
      renderSectionHeader={({ section }) => (
        <Text style={[styles.header, { color: t.textSecondary, backgroundColor: t.background }]}>
          {section.title}
        </Text>
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
            style={[styles.row, { backgroundColor: t.card }]}
          >
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[styles.title, { color: t.text }]}>
                {recipe?.title ?? 'Slettet oppskrift'}
              </Text>
              <Text style={{ color: t.textSecondary }}>
                kl. {timeFmt.format(new Date(item.date))}
                {item.calendarEventId ? ' · i kalenderen' : ''}
              </Text>
            </View>
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 8, flexGrow: 1 },
  header: { fontSize: 14, fontWeight: '600', textTransform: 'capitalize', paddingVertical: 6 },
  row: { borderRadius: radius, padding: 16, flexDirection: 'row' },
  title: { fontSize: 17, fontWeight: '600' },
});
