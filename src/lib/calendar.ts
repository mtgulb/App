import * as Calendar from 'expo-calendar/legacy';
import { Platform } from 'react-native';
import type { Recipe } from './types';

export class CalendarError extends Error {}

function buildNotes(recipe: Recipe): string {
  const parts: string[] = [];
  if (recipe.servings) parts.push(`Porsjoner: ${recipe.servings}`);
  if (recipe.ingredients.length) {
    parts.push('Ingredienser:\n' + recipe.ingredients.map((i) => `• ${i}`).join('\n'));
  }
  if (recipe.sourceUrl) parts.push(`Oppskrift: ${recipe.sourceUrl}`);
  return parts.join('\n\n');
}

async function targetCalendarId(): Promise<string> {
  const perm = await Calendar.requestCalendarPermissionsAsync();
  if (perm.status !== 'granted') {
    throw new CalendarError(
      'Appen har ikke tilgang til kalenderen. Gi tilgang i Innstillinger › appen › Kalendere.',
    );
  }
  if (Platform.OS === 'ios') {
    const def = await Calendar.getDefaultCalendarAsync();
    if (def?.allowsModifications) return def.id;
  }
  const all = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const writable = all.find((c) => c.allowsModifications);
  if (!writable) throw new CalendarError('Fant ingen kalender som kan endres.');
  return writable.id;
}

/** Legger middagen inn i enhetens kalender (synkes via iCloud/Google som ellers). */
export async function addDinnerEvent(recipe: Recipe, date: Date): Promise<string> {
  const calendarId = await targetCalendarId();
  const start = new Date(date);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  return Calendar.createEventAsync(calendarId, {
    title: `Middag: ${recipe.title}`,
    startDate: start,
    endDate: end,
    notes: buildNotes(recipe),
    url: recipe.sourceUrl,
  });
}

export async function removeDinnerEvent(eventId: string): Promise<void> {
  try {
    await Calendar.deleteEventAsync(eventId);
  } catch {
    // Hendelsen kan allerede være slettet i kalenderen.
  }
}
