import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { RecipeImage } from '@/components/RecipeImage';
import { Body, Button, Card, Chip, EmptyState, Heading, Stepper } from '@/components/ui';
import { removeDinnerEvent } from '@/lib/calendar';
import {
  baseServings,
  formatIngredient,
  hasKnownServings,
  parseIngredient,
  scaledLines,
} from '@/lib/ingredients';
import { analyzeRecipe } from '@/lib/pantry';
import { defaultServings } from '@/lib/portions';
import { formatMinutes } from '@/lib/recipeFilter';
import {
  addExtras,
  addRecipeToShopping,
  deleteRecipe,
  getState,
  markCooked,
  toggleFavorite,
  updateRecipe,
  useStore,
} from '@/lib/store';
import { useTheme } from '@/theme/colors';

export default function RecipeDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const t = useTheme();
  const { width } = useWindowDimensions();
  const hero = { width, height: 300 };
  const { recipes, plan, fridge, settings } = useStore();
  const recipe = recipes.find((r) => r.id === id);
  const [chosen, setChosen] = useState<number | null>(null);
  const servings = chosen ?? (recipe ? defaultServings(settings, recipe) : 4);

  if (!recipe) {
    return <EmptyState emoji="🤷" title="Fant ikke oppskriften" text="Den kan ha blitt slettet." />;
  }

  const fit = recipe
    ? analyzeRecipe(
        recipe,
        fridge.items.map((i) => i.name),
        false,
      )
    : null;

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
        <View style={styles.titleRow}>
          <Text style={[styles.title, styles.flex, { color: t.text }]}>{recipe.title}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={recipe.favorite ? 'Fjern fra favoritter' : 'Legg til i favoritter'}
            accessibilityState={{ selected: !!recipe.favorite }}
            hitSlop={10}
            onPress={() => toggleFavorite(recipe.id)}
          >
            <SymbolView
              name={recipe.favorite ? 'heart.fill' : 'heart'}
              tintColor={recipe.favorite ? t.tint : t.textSecondary}
              size={28}
            />
          </Pressable>
        </View>
        <View style={styles.chips}>
          {recipe.minutes ? <Chip>{formatMinutes(recipe.minutes)}</Chip> : null}
          <Chip>{recipe.ingredients.length} ingredienser</Chip>
          {recipe.steps.length > 0 ? <Chip>{recipe.steps.length} steg</Chip> : null}
          {(recipe.tags ?? []).map((tag) => (
            <Chip key={tag}>{tag}</Chip>
          ))}
        </View>
        <View
          style={styles.stars}
          accessibilityRole="adjustable"
          accessibilityLabel={`Vurdering ${recipe.rating ?? 0} av 5`}
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <Pressable
              key={n}
              accessibilityRole="button"
              accessibilityLabel={`${n} stjerner`}
              hitSlop={6}
              onPress={() =>
                updateRecipe(recipe.id, { rating: recipe.rating === n ? undefined : n })
              }
            >
              <SymbolView
                name={(recipe.rating ?? 0) >= n ? 'star.fill' : 'star'}
                tintColor={(recipe.rating ?? 0) >= n ? '#E0A100' : t.textSecondary}
                size={26}
              />
            </Pressable>
          ))}
        </View>
        {recipe.cookCount ? (
          <Body secondary>
            Laget {recipe.cookCount} {recipe.cookCount === 1 ? 'gang' : 'ganger'}
            {recipe.lastCookedAt
              ? `, sist ${new Intl.DateTimeFormat('nb-NO', { day: 'numeric', month: 'long' }).format(new Date(recipe.lastCookedAt))}`
              : ''}
          </Body>
        ) : null}

        {fit && settings.stockSuggestions && fridge.items.length > 0 ? (
          <Card>
            <Heading>Lageret ditt</Heading>
            <Body>
              {fit.have.length === fit.total
                ? 'Du har alt du trenger!'
                : `Du har ${fit.have.length} av ${fit.total} ingredienser.`}
            </Body>
            {fit.similar.length > 0 ? (
              <Body secondary>
                Lignende (sjekk selv):{' '}
                {fit.similar
                  .map((x) => `${parseIngredient(x.line).name.split(',')[0]} – du har ${x.fridge}`)
                  .join('; ')}
                .
              </Body>
            ) : null}
            {fit.missing.length > 0 ? (
              <Body secondary>
                Mangler: {fit.missing.map((l) => parseIngredient(l).name.split(',')[0]).join(', ')}.
              </Body>
            ) : null}
            {fit.missing.length > 0 ? (
              <Button
                title={`Legg ${fit.missing.length} manglende på handlelisten`}
                kind="secondary"
                onPress={() => {
                  const f = servings / baseServings(recipe);
                  addExtras(fit.missing.map((l) => formatIngredient(parseIngredient(l), f)));
                  Alert.alert(
                    'Lagt til',
                    'De manglende varene står nå under «Egne varer» i handlelisten.',
                  );
                }}
              />
            ) : null}
          </Card>
        ) : null}

        {recipe.steps.length > 0 ? (
          <Button
            title="Start kokemodus"
            kind="secondary"
            onPress={() =>
              router.push({
                pathname: '/recipe/cook',
                params: { id: recipe.id, servings: String(servings) },
              })
            }
          />
        ) : null}
        <Button
          title="Legg alle ingredienser på handlelisten"
          kind="secondary"
          onPress={() => {
            const already = getState().shopping.fromRecipes.some((x) => x.recipeId === recipe.id);
            addRecipeToShopping(recipe.id, servings);
            Alert.alert(
              already ? 'Oppdatert' : 'Lagt til',
              already
                ? `Oppskriften lå allerede på handlelisten. Porsjonene er satt til ${servings}.`
                : `Ingrediensene til ${servings} porsjoner ligger nå på handlelisten.`,
            );
          }}
        />
        <Button
          title="Planlegg middag"
          onPress={() =>
            router.push({
              pathname: '/recipe/plan',
              params: { recipeId: recipe.id, servings: String(servings) },
            })
          }
        />

        {recipe.ingredients.length > 0 && (
          <Card>
            <Heading>Ingredienser</Heading>
            <View style={styles.servingsRow}>
              <Text style={[styles.servingsLabel, { color: t.text }]}>Porsjoner</Text>
              <Stepper value={servings} onChange={setChosen} label="porsjoner" />
            </View>
            {!hasKnownServings(recipe) ? (
              <Body secondary>
                Oppskriften oppgir ikke porsjoner – {baseServings(recipe)} er antatt. Endre under
                «Rediger oppskrift».
              </Body>
            ) : null}
            {scaledLines(recipe, servings).map((i, n) => (
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

        <Button
          title="Rediger oppskrift"
          kind="secondary"
          onPress={() => router.push({ pathname: '/recipe/edit', params: { id: recipe.id } })}
        />
        {recipe.sourceUrl ? (
          <Button
            title="Åpne original"
            kind="secondary"
            onPress={() => Linking.openURL(recipe.sourceUrl!)}
          />
        ) : null}
        <Card>
          <Heading>Mine notater</Heading>
          <TextInput
            accessibilityLabel="Notater"
            defaultValue={recipe.notes ?? ''}
            onEndEditing={(e) =>
              updateRecipe(recipe.id, { notes: e.nativeEvent.text.trim() || undefined })
            }
            multiline
            placeholder="F.eks. «litt mindre salt neste gang»"
            placeholderTextColor={t.textSecondary}
            style={[
              styles.notes,
              { color: t.text, backgroundColor: t.background, borderColor: t.border },
            ]}
          />
        </Card>
        <Button
          title="Merk som laget i dag"
          kind="secondary"
          onPress={() => markCooked(recipe.id)}
        />
        <Button title="Slett oppskrift" kind="destructive" onPress={confirmDelete} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 48 },
  body: { padding: 20, gap: 16 },
  title: { fontSize: 30, fontWeight: '800', letterSpacing: -0.7 },
  servingsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  servingsLabel: { fontSize: 16, fontWeight: '600' },
  flex: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  stars: { flexDirection: 'row', gap: 6 },
  notes: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
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
