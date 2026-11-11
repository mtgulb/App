import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Screen } from '@/components/Screen';
import { Body, Button, Card, ErrorText, Field } from '@/components/ui';
import { getRecipe, updateRecipe } from '@/lib/store';

const lines = (s: string) =>
  s
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

export default function EditRecipe() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const recipe = getRecipe(id);
  const [title, setTitle] = useState(recipe?.title ?? '');
  const [servings, setServings] = useState(recipe?.servings ?? '');
  const [ingredients, setIngredients] = useState(recipe?.ingredients.join('\n') ?? '');
  const [steps, setSteps] = useState(recipe?.steps.join('\n') ?? '');
  const [error, setError] = useState<string | null>(null);

  if (!recipe) return <Body>Fant ikke oppskriften.</Body>;

  function save() {
    if (!title.trim()) {
      setError('Oppskriften trenger en tittel.');
      return;
    }
    updateRecipe(id, {
      title: title.trim(),
      servings: servings.trim() || undefined,
      ingredients: lines(ingredients),
      steps: lines(steps),
    });
    router.back();
  }

  return (
    <Screen>
      <Card>
        <Field label="Tittel" value={title} onChangeText={setTitle} />
        <Field
          label="Porsjoner"
          value={servings}
          onChangeText={setServings}
          keyboardType="number-pad"
        />
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
        <ErrorText>{error}</ErrorText>
        <Button title="Lagre endringer" onPress={save} />
      </Card>
    </Screen>
  );
}
