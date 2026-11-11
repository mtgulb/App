import { Link, useRouter } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
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
        data={recipes}
        keyExtractor={(r) => r.id}
        columnWrapperStyle={{ gap: GAP }}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState
            emoji="📖"
            title="Ingen oppskrifter ennå"
            text="Trykk på + for å legge inn en lenke, ta bilde eller skrive inn en oppskrift."
          />
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
  card: { borderRadius: radius, overflow: 'hidden' },
  image: { width: '100%', aspectRatio: 1.1 },
  cardText: { padding: 12, gap: 4, minHeight: 74 },
  title: { fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },
  meta: { fontSize: 13 },
});
