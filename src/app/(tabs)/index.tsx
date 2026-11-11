import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { RecipeImage } from '@/components/RecipeImage';
import { EmptyState, LargeTitle } from '@/components/ui';
import { useStore } from '@/lib/store';
import { radius, shadow, useTheme } from '@/theme/colors';

const GAP = 14;
const PAD = 20;

export default function RecipesScreen() {
  const t = useTheme();
  const router = useRouter();
  const { recipes } = useStore();
  const { width } = useWindowDimensions();
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const shown = q
    ? recipes.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.ingredients.some((i) => i.toLowerCase().includes(q)),
      )
    : recipes;
  const cardWidth = (width - PAD * 2 - GAP) / 2;

  return (
    <View style={[styles.flex, { backgroundColor: t.background }]}>
      <LargeTitle
        title="Oppskrifter"
        actionIcon="plus"
        actionLabel="Ny oppskrift"
        onAction={() => router.push('/recipe/new')}
      />
      <FlatList
        numColumns={2}
        data={shown}
        keyboardShouldPersistTaps="handled"
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
        keyExtractor={(r) => r.id}
        columnWrapperStyle={{ gap: GAP }}
        contentContainerStyle={styles.list}
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
        renderItem={({ item }) => (
          <Link href={{ pathname: '/recipe/[id]', params: { id: item.id } }} asChild>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={item.title}
              style={({ pressed }) => [
                styles.card,
                shadow,
                { width: cardWidth, backgroundColor: t.card, opacity: pressed ? 0.85 : 1 },
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
          </Link>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { paddingHorizontal: PAD, paddingBottom: 32, gap: GAP, flexGrow: 1 },
  search: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 2,
  },
  card: { borderRadius: radius, overflow: 'hidden' },
  image: { width: '100%', aspectRatio: 1.1 },
  cardText: { padding: 12, gap: 4, minHeight: 74 },
  title: { fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },
  meta: { fontSize: 13 },
});
