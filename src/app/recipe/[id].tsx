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
  markCooked,
  toggleFavorite,
  updateRecipe,
  useStore,
} from '@/lib/store';
import { useTheme } from '@/theme/colors';
import { dateTag, t as tr } from '@/i18n';

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
    return (
      <EmptyState emoji="🤷" title={tr('recipe.notFoundTitle')} text={tr('recipe.notFoundText')} />
    );
  }

  const fit = recipe
    ? analyzeRecipe(
        recipe,
        fridge.items.map((i) => i.name),
        false,
      )
    : null;

  function confirmDelete() {
    Alert.alert(tr('recipe.deleteTitle'), tr('recipe.deleteMessage'), [
      { text: tr('recipe.cancel'), style: 'cancel' },
      {
        text: tr('recipe.delete'),
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
            accessibilityLabel={recipe.favorite ? tr('recipe.favRemove') : tr('recipe.favAdd')}
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
          <Chip>{tr('recipe.ingredientCount', { count: recipe.ingredients.length })}</Chip>
          {recipe.steps.length > 0 ? (
            <Chip>{tr('recipe.stepCount', { count: recipe.steps.length })}</Chip>
          ) : null}
          {(recipe.tags ?? []).map((tag) => (
            <Chip key={tag}>{tag}</Chip>
          ))}
        </View>
        <View
          style={styles.stars}
          accessibilityRole="adjustable"
          accessibilityLabel={tr('recipe.ratingLabel', { rating: recipe.rating ?? 0 })}
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <Pressable
              key={n}
              accessibilityRole="button"
              accessibilityLabel={tr('recipe.starsLabel', { n })}
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
            {tr('recipe.cooked', { count: recipe.cookCount })}
            {recipe.lastCookedAt
              ? tr('recipe.lastCooked', {
                  date: new Intl.DateTimeFormat(dateTag(), {
                    day: 'numeric',
                    month: 'long',
                  }).format(new Date(recipe.lastCookedAt)),
                })
              : ''}
          </Body>
        ) : null}

        {fit && settings.stockSuggestions && fridge.items.length > 0 ? (
          <Card>
            <Heading>{tr('recipe.stockTitle')}</Heading>
            <Body>
              {fit.have.length === fit.total
                ? tr('recipe.haveAll')
                : tr('recipe.haveSome', { have: fit.have.length, total: fit.total })}
            </Body>
            {fit.similar.length > 0 ? (
              <Body secondary>
                {tr('recipe.similar', {
                  items: fit.similar
                    .map((x) =>
                      tr('recipe.similarItem', {
                        name: parseIngredient(x.line).name.split(',')[0],
                        have: x.fridge,
                      }),
                    )
                    .join('; '),
                })}
              </Body>
            ) : null}
            {fit.missing.length > 0 ? (
              <Body secondary>
                {tr('recipe.missing', {
                  items: fit.missing.map((l) => parseIngredient(l).name.split(',')[0]).join(', '),
                })}
              </Body>
            ) : null}
            {fit.missing.length > 0 ? (
              <Button
                title={tr('recipe.addMissing', { count: fit.missing.length })}
                kind="secondary"
                onPress={() => {
                  const f = servings / baseServings(recipe);
                  addExtras(fit.missing.map((l) => formatIngredient(parseIngredient(l), f)));
                  Alert.alert(tr('recipe.added'), tr('recipe.addedMissingMsg'));
                }}
              />
            ) : null}
          </Card>
        ) : null}

        {recipe.steps.length > 0 ? (
          <Button
            title={tr('recipe.startCook')}
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
          title={tr('recipe.addAll')}
          kind="secondary"
          onPress={() => {
            const n = addRecipeToShopping(recipe.id, servings);
            Alert.alert(
              tr('recipe.added'),
              n > 1 ? tr('recipe.addedMany', { count: n }) : tr('recipe.addedOne', { servings }),
            );
          }}
        />
        <Button
          title={tr('recipe.plan')}
          onPress={() =>
            router.push({
              pathname: '/recipe/plan',
              params: { recipeId: recipe.id, servings: String(servings) },
            })
          }
        />

        {recipe.ingredients.length > 0 && (
          <Card>
            <Heading>{tr('recipe.ingredients')}</Heading>
            <View style={styles.servingsRow}>
              <Text style={[styles.servingsLabel, { color: t.text }]}>{tr('recipe.servings')}</Text>
              <Stepper value={servings} onChange={setChosen} label={tr('recipe.servingsA11y')} />
            </View>
            {!hasKnownServings(recipe) ? (
              <Body secondary>
                {tr('recipe.servingsUnknown', { servings: baseServings(recipe) })}
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
            <Heading>{tr('recipe.steps')}</Heading>
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
          <Body secondary>{tr('recipe.onlyImages')}</Body>
        ) : null}

        <Button
          title={tr('recipe.edit')}
          kind="secondary"
          onPress={() => router.push({ pathname: '/recipe/edit', params: { id: recipe.id } })}
        />
        {recipe.sourceUrl ? (
          <Button
            title={tr('recipe.openOriginal')}
            kind="secondary"
            onPress={() => Linking.openURL(recipe.sourceUrl!)}
          />
        ) : null}
        <Card>
          <Heading>{tr('recipe.notes')}</Heading>
          <TextInput
            accessibilityLabel={tr('recipe.notesLabel')}
            defaultValue={recipe.notes ?? ''}
            onEndEditing={(e) =>
              updateRecipe(recipe.id, { notes: e.nativeEvent.text.trim() || undefined })
            }
            multiline
            placeholder={tr('recipe.notesPlaceholder')}
            placeholderTextColor={t.textSecondary}
            style={[
              styles.notes,
              { color: t.text, backgroundColor: t.background, borderColor: t.border },
            ]}
          />
        </Card>
        <Button
          title={tr('recipe.markCooked')}
          kind="secondary"
          onPress={() => markCooked(recipe.id)}
        />
        <Button title={tr('recipe.deleteRecipe')} kind="destructive" onPress={confirmDelete} />
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
