import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Linking, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { Body, Button, ErrorText, Heading, Stepper } from '@/components/ui';
import { addDinnerEvent, CalendarError } from '@/lib/calendar';
import { baseServings } from '@/lib/ingredients';
import { addPlanEntry, getRecipe } from '@/lib/store';
import { useTheme } from '@/theme/colors';

function defaultDinner(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(17, 0, 0, 0);
  return d;
}

export default function PlanDinner() {
  const { recipeId, servings: servingsParam } = useLocalSearchParams<{
    recipeId: string;
    servings?: string;
  }>();
  const router = useRouter();
  const t = useTheme();
  const recipe = getRecipe(recipeId);
  const [date, setDate] = useState(defaultDinner);
  const [servings, setServings] = useState(
    () => parseInt(servingsParam ?? '', 10) || (recipe ? baseServings(recipe) : 4),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsSettings, setNeedsSettings] = useState(false);

  if (!recipe) return <Body>Fant ikke oppskriften.</Body>;

  function planOnly() {
    addPlanEntry({ recipeId: recipe!.id, date: date.toISOString(), servings });
    router.dismissAll();
  }

  async function save() {
    setError(null);
    setBusy(true);
    try {
      const eventId = await addDinnerEvent(recipe!, date, servings);
      addPlanEntry({
        recipeId: recipe!.id,
        date: date.toISOString(),
        calendarEventId: eventId,
        servings,
      });
      router.dismissAll();
    } catch (e) {
      const settings = e instanceof CalendarError && e.needsSettings;
      const msg = e instanceof CalendarError ? e.message : 'Kunne ikke legge inn i kalenderen.';
      setError(msg);
      setNeedsSettings(settings);
      Alert.alert('Kalender', msg, [
        { text: 'Avbryt', style: 'cancel' },
        ...(settings
          ? [{ text: 'Åpne Innstillinger', onPress: () => Linking.openSettings() }]
          : []),
        { text: 'Legg bare i planen', onPress: planOnly },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Heading>{recipe.title}</Heading>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Body>Porsjoner denne dagen</Body>
        <Stepper value={servings} onChange={setServings} label="porsjoner" />
      </View>
      <Body secondary>
        Middagen legges i kalenderen med ingrediensene til {servings} i notatfeltet.
      </Body>
      <DateTimePicker
        value={date}
        mode="datetime"
        display="inline"
        accentColor={t.tint}
        minuteInterval={5}
        locale="nb-NO"
        onChange={(_, d) => d && setDate(d)}
      />
      <ErrorText>{error}</ErrorText>
      {needsSettings ? (
        <Button
          title="Åpne Innstillinger"
          kind="secondary"
          onPress={() => Linking.openSettings()}
        />
      ) : null}
      <Button title="Legg i kalender" onPress={save} loading={busy} />
      <Button title="Legg bare i planen (uten kalender)" kind="secondary" onPress={planOnly} />
    </Screen>
  );
}
