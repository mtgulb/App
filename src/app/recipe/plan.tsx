import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';
import { Screen } from '@/components/Screen';
import { Body, Button, ErrorText, Heading } from '@/components/ui';
import { addDinnerEvent, CalendarError } from '@/lib/calendar';
import { addPlanEntry, getRecipe } from '@/lib/store';

function defaultDinner(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(17, 0, 0, 0);
  return d;
}

export default function PlanDinner() {
  const { recipeId } = useLocalSearchParams<{ recipeId: string }>();
  const router = useRouter();
  const recipe = getRecipe(recipeId);
  const [date, setDate] = useState(defaultDinner);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!recipe) return <Body>Fant ikke oppskriften.</Body>;

  function planOnly() {
    addPlanEntry({ recipeId: recipe!.id, date: date.toISOString() });
    router.dismissAll();
  }

  async function save() {
    setError(null);
    setBusy(true);
    try {
      const eventId = await addDinnerEvent(recipe!, date);
      addPlanEntry({ recipeId: recipe!.id, date: date.toISOString(), calendarEventId: eventId });
      router.dismissAll();
    } catch (e) {
      const msg = e instanceof CalendarError ? e.message : 'Kunne ikke legge inn i kalenderen.';
      setError(msg);
      Alert.alert('Kalender', msg, [
        { text: 'Avbryt', style: 'cancel' },
        { text: 'Legg bare i planen', onPress: planOnly },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Heading>{recipe.title}</Heading>
      <Body secondary>
        Middagen legges i kalenderen på telefonen med ingrediensene i notatfeltet.
      </Body>
      <DateTimePicker
        value={date}
        mode="datetime"
        display="inline"
        minuteInterval={5}
        locale="nb-NO"
        onChange={(_, d) => d && setDate(d)}
      />
      <ErrorText>{error}</ErrorText>
      <Button title="Legg i kalender" onPress={save} loading={busy} />
    </Screen>
  );
}
