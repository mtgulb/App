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
import { structureRecipeText } from '@/lib/structureText';
import { addRecipe } from '@/lib/store';

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
  const [pasted, setPasted] = useState('');
  const [reading, setReading] = useState(false);
  const [readNote, setReadNote] = useState<string | null>(null);
  const [pasteNote, setPasteNote] = useState<string | null>(null);

  async function runImport() {
    setImportError(null);
    setImporting(true);
    try {
      const data = await importRecipeFromUrl(url);
      const recipe = addRecipe(data);
      router.replace({ pathname: '/recipe/[id]', params: { id: recipe.id } });
    } catch (e) {
      setImportError(e instanceof ImportError ? e.message : 'Noe gikk galt under importen.');
    } finally {
      setImporting(false);
    }
  }

  /** Gjør innlimt eller skannet tekst om til tittel, ingredienser og steg. */
  function structurePasted() {
    const r = structureRecipeText(pasted.split('\n'));
    if (!r.title && r.ingredients.length === 0 && r.steps.length === 0) {
      setPasteNote('Fant ikke noe å lese i teksten.');
      return;
    }
    setTitle((v) => v || r.title);
    setServings((v) => v || r.servings || '');
    setIngredients(r.ingredients.length ? r.ingredients.map(rowFromLine) : [emptyIngredientRow()]);
    setSteps(r.steps.length ? stepsFromLines(r.steps) : stepsFromLines(['']));
    setPasteNote('Teksten er delt opp i ingredienser og steg. Sjekk og rett opp før du lagrer.');
  }

  async function addPhotos(source: 'camera' | 'library') {
    let saved: string[];
    try {
      saved = await pickImages(source);
    } catch {
      setFormError('Kunne ikke lagre bildet.');
      return;
    }
    if (saved.length === 0) return;
    setImages((prev) => [...prev, ...saved]);
    await readText(saved);
  }

  async function readText(uris: string[]) {
    setReadNote(null);
    if (!ocrAvailable()) {
      setReadNote(
        'Tekstgjenkjenning er ikke tilgjengelig i denne versjonen av appen. Skriv inn teksten selv.',
      );
      return;
    }
    setReading(true);
    try {
      const r = await recipeFromImages(uris);
      if (!r || (!r.title && r.ingredients.length === 0 && r.steps.length === 0)) {
        setReadNote('Fant ingen tekst i bildet. Prøv et skarpere bilde, eller skriv inn selv.');
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
      setReadNote('Tekst lest fra bildet. Sjekk og rett opp før du lagrer.');
    } catch {
      setReadNote('Kunne ikke lese teksten i bildet. Skriv inn selv.');
    } finally {
      setReading(false);
    }
  }

  function save() {
    if (!title.trim()) {
      setFormError('Gi oppskriften en tittel.');
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
        <Heading>Fra lenke</Heading>
        <Field
          label="Lenke til oppskrift"
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
          title="Hent oppskrift"
          onPress={runImport}
          loading={importing}
          disabled={!url.trim()}
        />
      </Card>

      <Card>
        <Heading>Lim inn eller skann tekst</Heading>
        <Body secondary>
          Lim inn en oppskrift du har kopiert. Eller skann den med kameraet: trykk og hold i feltet
          og velg «Skann tekst» (kamera-ikonet), så leser iPhone teksten rett inn her.
        </Body>
        <Field
          label="Oppskriftstekst"
          value={pasted}
          onChangeText={setPasted}
          multiline
          placeholder="Tittel, ingredienser, fremgangsmåte …"
        />
        <Button
          title="Del opp i ingredienser og steg"
          onPress={structurePasted}
          disabled={!pasted.trim()}
        />
        {pasteNote ? <Body secondary>{pasteNote}</Body> : null}
      </Card>

      <Card>
        <Heading>Fra bilde eller manuelt</Heading>
        <Body secondary>
          Ta bilde av en oppskrift eller velg fra bildene dine – teksten leses automatisk på
          telefonen. Du kan også skrive inn selv.
        </Body>
        <View style={styles.buttons}>
          <View style={styles.flex}>
            <Button title="Ta bilde" kind="secondary" onPress={() => addPhotos('camera')} />
          </View>
          <View style={styles.flex}>
            <Button title="Velg bilder" kind="secondary" onPress={() => addPhotos('library')} />
          </View>
        </View>
        <View style={styles.thumbs}>
          {images.map((uri) => (
            <Pressable
              key={uri}
              accessibilityRole="button"
              accessibilityLabel="Fjern bilde"
              onPress={() => setImages((p) => p.filter((u) => u !== uri))}
            >
              <Image source={uri} style={styles.thumb} contentFit="cover" />
            </Pressable>
          ))}
        </View>
        {reading ? <Body secondary>Leser tekst fra bildet …</Body> : null}
        {readNote ? <Body secondary>{readNote}</Body> : null}
        <Field label="Tittel" value={title} onChangeText={setTitle} placeholder="F.eks. Lasagne" />
        <Field
          label="Porsjoner (grunnlag for mengdene)"
          value={servings}
          onChangeText={setServings}
          keyboardType="number-pad"
          placeholder="F.eks. 4"
        />
        <Field
          label="Tid i minutter (valgfritt)"
          value={minutes}
          onChangeText={setMinutes}
          keyboardType="number-pad"
          placeholder="F.eks. 30"
        />
        <Field
          label="Tagger, adskilt med komma (valgfritt)"
          value={tags}
          onChangeText={setTags}
          autoCapitalize="none"
          placeholder="F.eks. hverdag, barnevennlig"
        />
        <Heading>Ingredienser</Heading>
        <IngredientEditor rows={ingredients} onChange={setIngredients} />
        <Heading>Fremgangsmåte</Heading>
        <StepEditor rows={steps} onChange={setSteps} />
        <ErrorText>{formError}</ErrorText>
        <Button title="Lagre oppskrift" onPress={save} />
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
