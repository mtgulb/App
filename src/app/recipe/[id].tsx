import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Linking, ScrollView, StyleSheet, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { Body, Button, Card, EmptyState, Heading } from '@/components/ui';
import { removeDinnerEvent } from '@/lib/calendar';
import { deleteRecipe, useStore } from '@/lib/store';

export default function RecipeDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { recipes, plan } = useStore();
  const recipe = recipes.find((r) => r.id === id);

  if (!recipe) return <EmptyState title="Fant ikke oppskriften" text="Den kan ha blitt slettet." />;

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
    <Screen>
      <Stack.Screen options={{ title: recipe.title }} />
      {recipe.images.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.gallery}
        >
          {recipe.images.map((uri) => (
            <Image key={uri} source={uri} style={styles.image} contentFit="cover" />
          ))}
        </ScrollView>
      )}
      <Heading>{recipe.title}</Heading>
      {recipe.servings ? <Body secondary>Porsjoner: {recipe.servings}</Body> : null}
      <Button
        title="Planlegg middag"
        onPress={() => router.push({ pathname: '/recipe/plan', params: { recipeId: recipe.id } })}
      />
      {recipe.ingredients.length > 0 && (
        <Card>
          <Heading>Ingredienser</Heading>
          {recipe.ingredients.map((i, n) => (
            <Body key={n}>• {i}</Body>
          ))}
        </Card>
      )}
      {recipe.steps.length > 0 && (
        <Card>
          <Heading>Fremgangsmåte</Heading>
          {recipe.steps.map((s, n) => (
            <View key={n}>
              <Body>
                {n + 1}. {s}
              </Body>
            </View>
          ))}
        </Card>
      )}
      {recipe.sourceUrl ? (
        <Button
          title="Åpne original"
          kind="secondary"
          onPress={() => Linking.openURL(recipe.sourceUrl!)}
        />
      ) : null}
      <Button title="Slett oppskrift" kind="destructive" onPress={confirmDelete} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  gallery: { gap: 8 },
  image: { width: 260, height: 180, borderRadius: 12 },
});
