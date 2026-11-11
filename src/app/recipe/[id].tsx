import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import {
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { RecipeImage } from '@/components/RecipeImage';
import { Body, Button, Card, Chip, EmptyState, Heading } from '@/components/ui';
import { removeDinnerEvent } from '@/lib/calendar';
import { deleteRecipe, useStore } from '@/lib/store';
import { useTheme } from '@/theme/colors';

export default function RecipeDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const t = useTheme();
  const { width } = useWindowDimensions();
  const hero = { width, height: 300 };
  const { recipes, plan } = useStore();
  const recipe = recipes.find((r) => r.id === id);

  if (!recipe) {
    return <EmptyState emoji="🤷" title="Fant ikke oppskriften" text="Den kan ha blitt slettet." />;
  }

  function confirmDelete() {
    Alert.alert('Slette oppskriften?', 'Planlagte middager med denne oppskriften fjernes også.', [
      { text: 'Avbryt', style: 'cancel' },
      {
        text: 'Slett',
        style: 'destructive',
        onPress: async () => {
          const events = plan.filter((p) => p.recipeId === id && p.calendarEventId);
          for (const p of events) await removeDinnerEvent(p.calendarEventId!);
          deleteRecipe(id);
          router.back();
        },
      },
    ]);
  }

  return (
    <ScrollView
      style={{ backgroundColor: t.background }}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="never"
    >
      <Stack.Screen options={{ title: '', headerTransparent: true, headerTintColor: t.tint }} />

      {recipe.images.length > 1 ? (
        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
          {recipe.images.map((uri) => (
            <RecipeImage key={uri} uri={uri} style={hero} />
          ))}
        </ScrollView>
      ) : (
        <RecipeImage uri={recipe.images[0]} style={hero} />
      )}

      <View style={styles.body}>
        <Text style={[styles.title, { color: t.text }]}>{recipe.title}</Text>
        <View style={styles.chips}>
          {recipe.servings ? <Chip>{recipe.servings} porsjoner</Chip> : null}
          <Chip>{recipe.ingredients.length} ingredienser</Chip>
          {recipe.steps.length > 0 ? <Chip>{recipe.steps.length} steg</Chip> : null}
        </View>

        <Button
          title="Planlegg middag"
          onPress={() => router.push({ pathname: '/recipe/plan', params: { recipeId: recipe.id } })}
        />

        {recipe.ingredients.length > 0 && (
          <Card>
            <Heading>Ingredienser</Heading>
            {recipe.ingredients.map((i, n) => (
              <View
                key={n}
                style={[
                  styles.ingredient,
                  n > 0 && { borderTopWidth: 1, borderTopColor: t.border },
                ]}
              >
                <View style={[styles.dot, { backgroundColor: t.tint }]} />
                <Text style={[styles.itemText, { color: t.text }]}>{i}</Text>
              </View>
            ))}
          </Card>
        )}

        {recipe.steps.length > 0 && (
          <Card>
            <Heading>Fremgangsmåte</Heading>
            {recipe.steps.map((s, n) => (
              <View key={n} style={styles.step}>
                <View style={[styles.badge, { backgroundColor: t.tintSoft }]}>
                  <Text style={[styles.badgeText, { color: t.tint }]}>{n + 1}</Text>
                </View>
                <Text style={[styles.itemText, { color: t.text }]}>{s}</Text>
              </View>
            ))}
          </Card>
        )}

        {recipe.ingredients.length === 0 && recipe.steps.length === 0 ? (
          <Body secondary>Ingen tekst lagt inn ennå – bare bilder.</Body>
        ) : null}

        {recipe.sourceUrl ? (
          <Button
            title="Åpne original"
            kind="secondary"
            onPress={() => Linking.openURL(recipe.sourceUrl!)}
          />
        ) : null}
        <Button title="Slett oppskrift" kind="destructive" onPress={confirmDelete} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 48 },
  body: { padding: 20, gap: 16 },
  title: { fontSize: 30, fontWeight: '800', letterSpacing: -0.7 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  ingredient: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  step: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', paddingVertical: 6 },
  badge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 14, fontWeight: '700' },
  itemText: { flex: 1, fontSize: 16, lineHeight: 23 },
});
