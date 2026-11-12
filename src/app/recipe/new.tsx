import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  emptyIngredientRow,
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
import { ImportError, importRecipeFromUrl } from '@/lib/importFromUrl';
import { ocrAvailable, recipeFromImages } from '@/lib/ocr';
import { pickImages } from '@/lib/pickImages';
import { parseTags } from '@/lib/recipeFilter';
import { addRecipe } from '@/lib/store';
import { t as tr } from '@/i18n';

export default function NewRecipeScreen() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [servings, setServings] = useState('');
  const [minutes, setMinutes] = useState('');
  const [tags, setTags] = useState('');
  const [ingredients, setIngredients] = useState<IngredientRow[]>(() => [emptyIngredientRow()]);
  const [steps, setSteps] = useState<StepRow[]>(() => stepsFromLines(['']));
  const [images, setImages] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [readNote, setReadNote] = useState<string | null>(null);

  async function runImport() {
    setImportError(null);
    setImporting(true);
    try {
      const { data, needsReview } = await importRecipeFromUrl(url);
      const recipe = addRecipe(data);
      // Gjettet ut fra sidens tekst: la brukeren sjekke før de bruker den.
      if (needsReview)
        router.replace({ pathname: '/recipe/edit', params: { id: recipe.id, review: '1' } });
      else router.replace({ pathname: '/recipe/[id]', params: { id: recipe.id } });
    } catch (e) {
      setImportError(e instanceof ImportError ? e.message : tr('recipe.importFailed'));
    } finally {
      setImporting(false);
    }
  }

  async function addPhotos(source: 'camera' | 'library') {
    let saved: string[];
    try {
      saved = await pickImages(source);
    } catch {
      setFormError(tr('recipe.imageSaveFailed'));
      return;
    }
    if (saved.length === 0) return;
    setImages((prev) => [...prev, ...saved]);
    await readText(saved);
  }

  async function readText(uris: string[]) {
    setReadNote(null);
    if (!ocrAvailable()) {
      setReadNote(tr('recipe.ocrUnavailable'));
      return;
    }
    setReading(true);
    try {
      const r = await recipeFromImages(uris);
      if (!r || (!r.title && r.ingredients.length === 0 && r.steps.length === 0)) {
        setReadNote(tr('recipe.ocrNone'));
        return;
      }
      // Fyller bare ut felt som er tomme, så egne rettelser ikke overskrives.
      setTitle((v) => v || r.title);
      // Fyller bare ut når feltene er tomme, så egne rettelser ikke overskrives.
      setIngredients((v) =>
        v.some((x) => x.name.trim()) || r.ingredients.length === 0
          ? v
          : r.ingredients.map(rowFromLine),
      );
      setSteps((v) =>
        v.some((x) => x.text.trim()) || r.steps.length === 0 ? v : stepsFromLines(r.steps),
      );
      setReadNote(tr('recipe.ocrDone'));
    } catch {
      setReadNote(tr('recipe.ocrFailed'));
    } finally {
      setReading(false);
    }
  }

  function save() {
    if (!title.trim()) {
      setFormError(tr('recipe.titleRequired'));
      return;
    }
    const recipe = addRecipe({
      title: title.trim(),
      servings: servings.trim() || undefined,
      minutes: parseInt(minutes, 10) > 0 ? parseInt(minutes, 10) : undefined,
      tags: parseTags(tags),
      ingredients: ingredients.map(lineFromRow).filter(Boolean),
      steps: steps.map((x) => x.text.trim()).filter(Boolean),
      images,
    });
    router.replace({ pathname: '/recipe/[id]', params: { id: recipe.id } });
  }

  return (
    <Screen>
      <Card>
        <Heading>{tr('recipe.fromLink')}</Heading>
        <Field
          label={tr('recipe.linkLabel')}
          value={url}
          onChangeText={setUrl}
          placeholder="https://…"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          returnKeyType="go"
          onSubmitEditing={runImport}
        />
        <ErrorText>{importError}</ErrorText>
        <Button
          title={tr('recipe.fetch')}
          onPress={runImport}
          loading={importing}
          disabled={!url.trim()}
        />
      </Card>

      <Card>
        <Heading>{tr('recipe.fromImage')}</Heading>
        <Body secondary>{tr('recipe.fromImageHelp')}</Body>
        <View style={styles.buttons}>
          <View style={styles.flex}>
            <Button
              title={tr('recipe.takePhoto')}
              kind="secondary"
              onPress={() => addPhotos('camera')}
            />
          </View>
          <View style={styles.flex}>
            <Button
              title={tr('recipe.pickPhotos')}
              kind="secondary"
              onPress={() => addPhotos('library')}
            />
          </View>
        </View>
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
        {reading ? <Body secondary>{tr('recipe.reading')}</Body> : null}
        {readNote ? <Body secondary>{readNote}</Body> : null}
        <Field
          label={tr('recipe.titleLabel')}
          value={title}
          onChangeText={setTitle}
          placeholder={tr('recipe.titlePlaceholder')}
        />
        <Field
          label={tr('recipe.servingsBaseLabel')}
          value={servings}
          onChangeText={setServings}
          keyboardType="number-pad"
          placeholder={tr('recipe.servingsPlaceholder')}
        />
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
        <Heading>{tr('recipe.ingredients')}</Heading>
        <IngredientEditor rows={ingredients} onChange={setIngredients} />
        <Heading>{tr('recipe.steps')}</Heading>
        <StepEditor rows={steps} onChange={setSteps} />
        <ErrorText>{formError}</ErrorText>
        <Button title={tr('recipe.save')} onPress={save} />
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
