import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { Body, Button, Card, ErrorText, Field, Heading } from '@/components/ui';
import { persistImage } from '@/lib/images';
import { ImportError, importRecipeFromUrl } from '@/lib/importFromUrl';
import { addRecipe } from '@/lib/store';

const lines = (s: string) =>
  s
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

export default function NewRecipeScreen() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [ingredients, setIngredients] = useState('');
  const [steps, setSteps] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

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

  async function addPhotos(source: 'camera' | 'library') {
    const perm =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Mangler tilgang', 'Gi tilgang i Innstillinger › appen.');
      return;
    }
    const opts: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      quality: 0.8,
      allowsMultipleSelection: source === 'library',
    };
    const res =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync(opts)
        : await ImagePicker.launchImageLibraryAsync(opts);
    if (res.canceled) return;
    try {
      setImages((prev) => [...prev, ...res.assets.map((a) => persistImage(a.uri))]);
    } catch {
      setFormError('Kunne ikke lagre bildet.');
    }
  }

  function save() {
    if (!title.trim()) {
      setFormError('Gi oppskriften en tittel.');
      return;
    }
    const recipe = addRecipe({
      title: title.trim(),
      ingredients: lines(ingredients),
      steps: lines(steps),
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
        <Heading>Fra bilde eller manuelt</Heading>
        <Body secondary>
          Ta bilde av en oppskrift, eller velg fra bildene dine. Automatisk avlesing av tekst fra
          bilde er ikke på plass ennå – skriv inn tittel og ingredienser selv.
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
        <Field label="Tittel" value={title} onChangeText={setTitle} placeholder="F.eks. Lasagne" />
        <Field
          label="Ingredienser (én per linje)"
          value={ingredients}
          onChangeText={setIngredients}
          multiline
        />
        <Field
          label="Fremgangsmåte (ett steg per linje)"
          value={steps}
          onChangeText={setSteps}
          multiline
        />
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
