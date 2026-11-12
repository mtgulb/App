import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Linking, View } from 'react-native';
import { t, dateTag } from '@/i18n';
import { Screen } from '@/components/Screen';
import { Body, Button, ErrorText, Heading, Stepper } from '@/components/ui';
import { addDinnerEvent, CalendarError } from '@/lib/calendar';
import { defaultServings } from '@/lib/portions';
import { addPlanEntry, getRecipe, getState } from '@/lib/store';
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
  const c = useTheme();
  const recipe = getRecipe(recipeId);
  const [date, setDate] = useState(defaultDinner);
  const [servings, setServings] = useState(
    () =>
      parseInt(servingsParam ?? '', 10) ||
      (recipe ? defaultServings(getState().settings, recipe) : 4),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsSettings, setNeedsSettings] = useState(false);

  if (!recipe) return <Body>{t('plan.recipeNotFound')}</Body>;

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
      const msg = e instanceof CalendarError ? e.message : t('plan.addFailed');
      setError(msg);
      setNeedsSettings(settings);
      Alert.alert(t('plan.calendarAlertTitle'), msg, [
        { text: t('plan.cancel'), style: 'cancel' },
        ...(settings
          ? [{ text: t('plan.openSettings'), onPress: () => Linking.openSettings() }]
          : []),
        { text: t('plan.onlyInPlanAction'), onPress: planOnly },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Heading>{recipe.title}</Heading>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Body>{t('plan.servingsThisDay')}</Body>
        <Stepper value={servings} onChange={setServings} label={t('plan.servingsSuffix')} />
      </View>
      <Body secondary>{t('plan.willBeAdded', { servings })}</Body>
      <DateTimePicker
        value={date}
        mode="datetime"
        display="inline"
        accentColor={c.tint}
        minuteInterval={5}
        locale={dateTag()}
        onChange={(_, d) => d && setDate(d)}
      />
      <ErrorText>{error}</ErrorText>
      {needsSettings ? (
        <Button
          title={t('plan.openSettings')}
          kind="secondary"
          onPress={() => Linking.openSettings()}
        />
      ) : null}
      <Button title={t('plan.addToCalendar')} onPress={save} loading={busy} />
      <Button title={t('plan.addToPlanNoCalendar')} kind="secondary" onPress={planOnly} />
    </Screen>
  );
}
