import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { RecipeImage } from '@/components/RecipeImage';
import { EmptyState, LargeTitle } from '@/components/ui';
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

export default function RecipesScreen() {
  const t = useTheme();
  const router = useRouter();
  const { recipes } = useStore();
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const shown = q
    ? recipes.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.ingredients.some((i) => i.toLowerCase().includes(q)),
      )
    : recipes;

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
        secondaryIcon="person.2"
        secondaryLabel="Familie og deling"
        onSecondary={() => router.push('/family')}
      />
      <FlatList
        data={toRows(shown)}
        keyExtractor={(row) => row[0].id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          recipes.length > 0 ? (
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
          ) : undefined
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
