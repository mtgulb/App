import { Image } from 'expo-image';
import { Link, useRouter } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button, EmptyState } from '@/components/ui';
import { useStore } from '@/lib/store';
import { radius, useTheme } from '@/theme/colors';

export default function RecipesScreen() {
  const t = useTheme();
  const router = useRouter();
  const { recipes } = useStore();

  return (
    <FlatList
      style={{ backgroundColor: t.background }}
      contentContainerStyle={styles.list}
      contentInsetAdjustmentBehavior="automatic"
      data={recipes}
      keyExtractor={(r) => r.id}
      ListHeaderComponent={
        <Button title="Ny oppskrift" onPress={() => router.push('/recipe/new')} />
      }
      ListEmptyComponent={
        <EmptyState
          title="Ingen oppskrifter ennå"
          text="Legg inn en lenke, ta bilde eller skriv inn en oppskrift."
        />
      }
      renderItem={({ item }) => (
        <Link href={{ pathname: '/recipe/[id]', params: { id: item.id } }} asChild>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={item.title}
            style={[styles.row, { backgroundColor: t.card }]}
          >
            {item.images[0] ? (
              <Image source={item.images[0]} style={styles.thumb} contentFit="cover" />
            ) : (
              <View style={[styles.thumb, { backgroundColor: t.border }]} />
            )}
            <View style={styles.rowText}>
              <Text style={[styles.title, { color: t.text }]} numberOfLines={2}>
                {item.title}
              </Text>
              <Text style={{ color: t.textSecondary }}>{item.ingredients.length} ingredienser</Text>
            </View>
          </Pressable>
        </Link>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 12, flexGrow: 1 },
  row: { flexDirection: 'row', borderRadius: radius, overflow: 'hidden', alignItems: 'center' },
  thumb: { width: 72, height: 72 },
  rowText: { flex: 1, padding: 12, gap: 4 },
  title: { fontSize: 17, fontWeight: '600' },
});
