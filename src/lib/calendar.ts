import * as Calendar from 'expo-calendar/legacy';
import { Platform } from 'react-native';
import { scaledLines } from './ingredients';
import { t } from '../i18n/index.ts';
import type { Recipe } from './types';

export class CalendarError extends Error {
  /** True når brukeren må endre tilgangen i iPhone-innstillinger. */
  needsSettings: boolean;
  constructor(message: string, needsSettings = false) {
    super(message);
    this.needsSettings = needsSettings;
  }
}

function buildNotes(recipe: Recipe, servings: number): string {
  const parts: string[] = [t('calendar.notesServings', { servings })];
  if (recipe.ingredients.length) {
    parts.push(
      t('calendar.notesIngredients', { servings }) +
        '\n' +
        scaledLines(recipe, servings)
          .map((i) => `• ${i}`)
          .join('\n'),
    );
  }
  if (recipe.sourceUrl) parts.push(t('calendar.notesRecipe', { url: recipe.sourceUrl }));
  return parts.join('\n\n');
}

async function targetCalendarId(): Promise<string> {
  const perm = await Calendar.requestCalendarPermissionsAsync();
  if (perm.status !== 'granted') {
    throw new CalendarError(t('calendar.noAccess'), true);
  }
  if (Platform.OS === 'ios') {
    const def = await Calendar.getDefaultCalendarAsync();
    if (def?.allowsModifications) return def.id;
  }
  const all = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const writable = all.find((c) => c.allowsModifications);
  if (!writable) throw new CalendarError(t('calendar.noWritable'));
  return writable.id;
}

/** Legger middagen inn i enhetens kalender (synkes via iCloud/Google som ellers). */
export async function addDinnerEvent(
  recipe: Recipe,
  date: Date,
  servings: number,
): Promise<string> {
  const calendarId = await targetCalendarId();
  const start = new Date(date);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  return Calendar.createEventAsync(calendarId, {
    title: t('calendar.eventTitle', { title: recipe.title }),
    startDate: start,
    endDate: end,
    notes: buildNotes(recipe, servings),
    url: recipe.sourceUrl,
  });
}

/** Oppdaterer ingrediensene i kalenderhendelsen når porsjonene endres. Returnerer false ved feil. */
export async function updateDinnerEvent(
  eventId: string,
  recipe: Recipe,
  servings: number,
): Promise<boolean> {
  try {
    await Calendar.updateEventAsync(eventId, { notes: buildNotes(recipe, servings) });
    return true;
  } catch {
    return false;
  }
}

export async function removeDinnerEvent(eventId: string): Promise<void> {
  try {
    await Calendar.deleteEventAsync(eventId);
  } catch {
    // Hendelsen kan allerede være slettet i kalenderen.
  }
}
