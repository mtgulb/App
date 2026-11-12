import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  IngredientEditor,
  lineFromRow,
  rowFromLine,
  StepEditor,
  stepsFromLines,
  type IngredientRow,
  type StepRow,
} from '@/components/ListEditors';
import { Screen } from '@/components/Screen';
import { Body, Button, Card, ErrorText, Field, Heading } from '@/components/ui';
import { pickImages } from '@/lib/pickImages';
import { parseTags } from '@/lib/recipeFilter';
import { getRecipe, updateRecipe } from '@/lib/store';
import { t as tr } from '@/i18n';

export default function EditRecipe() {
  const { id, review } = useLocalSearchParams<{ id: string; review?: string }>();
  const router = useRouter();
  const recipe = getRecipe(id);
  const [title, setTitle] = useState(recipe?.title ?? '');
  const [servings, setServings] = useState(recipe?.servings ?? '');
  const [ingredients, setIngredients] = useState<IngredientRow[]>(() =>
    (recipe?.ingredients ?? []).map(rowFromLine),
  );
  const [steps, setSteps] = useState<StepRow[]>(() => stepsFromLines(recipe?.steps ?? []));
  const [minutes, setMinutes] = useState(recipe?.minutes ? String(recipe.minutes) : '');
  const [tags, setTags] = useState((recipe?.tags ?? []).join(', '));
  const [images, setImages] = useState<string[]>(recipe?.images ?? []);
  const [error, setError] = useState<string | null>(null);

  if (!recipe) return <Body>{tr('recipe.notFoundBody')}</Body>;

  async function add(source: 'camera' | 'library') {
    try {
      const saved = await pickImages(source);
      if (saved.length) setImages((prev) => [...prev, ...saved]);
    } catch {
      setError(tr('recipe.imageSaveFailed'));
    }
  }

  function save() {
    if (!title.trim()) {
      setError(tr('recipe.editTitleRequired'));
      return;
    }
    updateRecipe(id, {
      title: title.trim(),
      servings: servings.trim() || undefined,
      ingredients: ingredients.map(lineFromRow).filter(Boolean),
      steps: steps.map((x) => x.text.trim()).filter(Boolean),
      images,
      minutes: parseInt(minutes, 10) > 0 ? parseInt(minutes, 10) : undefined,
      tags: parseTags(tags),
    });
    router.back();
  }

  return (
    <Screen>
      {review ? (
        <Card>
          <Heading>{tr('recipe.reviewTitle')}</Heading>
          <Body secondary>{tr('recipe.reviewText')}</Body>
        </Card>
      ) : null}
      <Card>
        <Body secondary>{tr('recipe.imagesHelp')}</Body>
        <View style={styles.thumbs}>
          {images.map((uri) => (
            <Pressable
              key={uri}
              accessibilityRole="button"
              accessibilityLabel={tr('recipe.removeImage')}
              onPress={() => setImages((p) => p.filter((u) => u !== uri))}
            >
              <Image source={uri} style={styles.thumb} contentFit="cover" />
            </Pressable>
          ))}
        </View>
        <View style={styles.buttons}>
          <View style={styles.flex}>
            <Button title={tr('recipe.takePhoto')} kind="secondary" onPress={() => add('camera')} />
          </View>
          <View style={styles.flex}>
            <Button
              title={tr('recipe.pickPhoto')}
              kind="secondary"
              onPress={() => add('library')}
            />
          </View>
        </View>
        <Field label={tr('recipe.titleLabel')} value={title} onChangeText={setTitle} />
        <Field
          label={tr('recipe.minutesLabel')}
          value={minutes}
          onChangeText={setMinutes}
          keyboardType="number-pad"
          placeholder={tr('recipe.minutesPlaceholder')}
        />
        <Field
          label={tr('recipe.tagsLabel')}
          value={tags}
          onChangeText={setTags}
          autoCapitalize="none"
          placeholder={tr('recipe.tagsPlaceholder')}
        />
        <Field
          label={tr('recipe.servingsLabel')}
          value={servings}
          onChangeText={setServings}
          keyboardType="number-pad"
        />
        <Heading>{tr('recipe.ingredients')}</Heading>
        <IngredientEditor rows={ingredients} onChange={setIngredients} />
        <Heading>{tr('recipe.steps')}</Heading>
        <StepEditor rows={steps} onChange={setSteps} />
        <ErrorText>{error}</ErrorText>
        <Button title={tr('recipe.saveChanges')} onPress={save} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  buttons: { flexDirection: 'row', gap: 8 },
  flex: { flex: 1 },
  thumbs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  thumb: { width: 72, height: 72, borderRadius: 8 },
});
