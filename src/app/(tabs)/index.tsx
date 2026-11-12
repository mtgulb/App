import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActionSheetIOS,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ClipboardBanner } from '@/components/ClipboardBanner';
import { RecipeImage } from '@/components/RecipeImage';
import { EmptyState, LargeTitle } from '@/components/ui';
import {
  allTags,
  filterRecipes,
  hasActiveFilters,
  NO_FILTERS,
  SORT_LABELS,
  sortRecipes,
  TIME_OPTIONS,
  type RecipeFilters,
  type SortMode,
} from '@/lib/recipeFilter';
import { useStore } from '@/lib/store';
import type { Recipe } from '@/lib/types';
import { radius, shadow, useTheme } from '@/theme/colors';

const GAP = 14;
const PAD = 20;

/** Deler listen i rader med to oppskrifter. Hver rad deler bredden likt, så ingenting kan flyte utenfor skjermen. */
function toRows(recipes: Recipe[]): Recipe[][] {
  const rows: Recipe[][] = [];
  for (let i = 0; i < recipes.length; i += 2) rows.push(recipes.slice(i, i + 2));
  return rows;
}

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
    >
      <View style={[styles.filterChip, { backgroundColor: active ? t.tint : t.tintSoft }]}>
        <Text style={{ color: active ? '#FFFFFF' : t.tint, fontWeight: '600', fontSize: 13 }}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

export default function RecipesScreen() {
  const t = useTheme();
  const router = useRouter();
  const { recipes } = useStore();
  const [filters, setFilters] = useState<RecipeFilters>(NO_FILTERS);
  const [sort, setSort] = useState<SortMode>('newest');
  const query = filters.query;
  const setQuery = (q: string) => setFilters((f) => ({ ...f, query: q }));
  const tags = useMemo(() => allTags(recipes).slice(0, 8), [recipes]);
  const shown = useMemo(
    () => sortRecipes(filterRecipes(recipes, filters), sort),
    [recipes, filters, sort],
  );

  function cycleTime() {
    setFilters((f) => {
      const i =
        f.maxMinutes === null
          ? -1
          : TIME_OPTIONS.indexOf(f.maxMinutes as (typeof TIME_OPTIONS)[number]);
      return { ...f, maxMinutes: i + 1 >= TIME_OPTIONS.length ? null : TIME_OPTIONS[i + 1] };
    });
  }

  function pickSort() {
    if (Platform.OS !== 'ios') return;
    const modes = Object.keys(SORT_LABELS) as SortMode[];
    const options = [...modes.map((m) => SORT_LABELS[m]), 'Avbryt'];
    ActionSheetIOS.showActionSheetWithOptions(
      { title: 'Sorter etter', options, cancelButtonIndex: options.length - 1 },
      (i) => {
        if (i < modes.length) setSort(modes[i]);
      },
    );
  }

  function renderCard(item: Recipe) {
    return (
      <Pressable
        key={item.id}
        accessibilityRole="button"
        accessibilityLabel={item.title}
        onPress={() => router.push({ pathname: '/recipe/[id]', params: { id: item.id } })}
        style={({ pressed }) => [
          styles.card,
          shadow,
          { backgroundColor: t.card, opacity: pressed ? 0.85 : 1 },
        ]}
      >
        <RecipeImage uri={item.images[0]} style={styles.image} />
        <View style={styles.cardText}>
          <Text style={[styles.title, { color: t.text }]} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={[styles.meta, { color: t.textSecondary }]}>
            {item.ingredients.length} ingredienser
          </Text>
        </View>
      </Pressable>
    );
  }

  return (
    <View style={[styles.flex, { backgroundColor: t.background }]}>
      <LargeTitle
        title="Oppskrifter"
        actionIcon="plus"
        actionLabel="Ny oppskrift"
        onAction={() => router.push('/recipe/new')}
        secondaryIcon="gearshape"
        secondaryLabel="Innstillinger"
        onSecondary={() => router.push('/settings')}
      />
      <FlatList
        data={toRows(shown)}
        keyExtractor={(row) => row[0].id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.headerStack}>
            <ClipboardBanner />
            {recipes.length > 0 ? (
              <TextInput
                accessibilityLabel="Søk i oppskrifter"
                value={query}
                onChangeText={setQuery}
                placeholder="Søk på navn eller ingrediens"
                placeholderTextColor={t.textSecondary}
                clearButtonMode="while-editing"
                autoCorrect={false}
                style={[
                  styles.search,
                  { backgroundColor: t.card, color: t.text, borderColor: t.border },
                ]}
              />
            ) : null}
            {recipes.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterRow}
              >
                <FilterChip
                  label="♥ Favoritter"
                  active={filters.favoritesOnly}
                  onPress={() => setFilters((f) => ({ ...f, favoritesOnly: !f.favoritesOnly }))}
                />
                <FilterChip
                  label={filters.maxMinutes ? `Opptil ${filters.maxMinutes} min` : 'Tid'}
                  active={filters.maxMinutes !== null}
                  onPress={cycleTime}
                />
                {tags.map((tag) => (
                  <FilterChip
                    key={tag}
                    label={tag}
                    active={filters.tag === tag}
                    onPress={() => setFilters((f) => ({ ...f, tag: f.tag === tag ? null : tag }))}
                  />
                ))}
                <FilterChip
                  label={`Sorter: ${SORT_LABELS[sort]}`}
                  active={sort !== 'newest'}
                  onPress={pickSort}
                />
                {hasActiveFilters(filters) ? (
                  <FilterChip
                    label="Nullstill"
                    active={false}
                    onPress={() => setFilters(NO_FILTERS)}
                  />
                ) : null}
              </ScrollView>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          recipes.length > 0 ? (
            <EmptyState emoji="🔍" title="Ingen treff" text="Prøv et annet søkeord." />
          ) : (
            <EmptyState
              emoji="📖"
              title="Ingen oppskrifter ennå"
              text="Trykk på + for å legge inn en lenke, ta bilde eller skrive inn en oppskrift."
            />
          )
        }
        renderItem={({ item: row }) => (
          <View style={styles.row}>
            {renderCard(row[0])}
            {row[1] ? renderCard(row[1]) : <View style={styles.spacer} />}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { paddingHorizontal: PAD, paddingBottom: 32, gap: GAP, flexGrow: 1 },
  headerStack: { gap: 12 },
  filterRow: { gap: 8, paddingRight: 8 },
  filterChip: { borderRadius: 16, paddingHorizontal: 12, paddingVertical: 7 },
  row: { flexDirection: 'row', gap: GAP },
  card: { flex: 1, borderRadius: radius, overflow: 'hidden' },
  spacer: { flex: 1 },
  search: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 2,
  },
  image: { width: '100%', aspectRatio: 1.1 },
  cardText: { padding: 12, gap: 4, minHeight: 74 },
  title: { fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },
  meta: { fontSize: 13 },
});
