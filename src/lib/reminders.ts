import { baseServings, parseIngredient } from './ingredients.ts';
import { matchLevel } from './pantry.ts';
import type { Settings } from './portions.ts';
import type { FridgeItem, MealPlanEntry, Recipe } from './types.ts';

export type PlannedReminder = { id: string; at: Date; title: string; body: string };

const HORIZON_DAYS = 14;

/**
 * Beregner hvilke påminnelser som skal ligge klare. Ingenting planlegges med mindre brukeren har slått det på.
 * - «Kvelden før» (kl. 20): ta ut fra fryseren hvis oppskriften bruker noe som ligger der.
 * - «Middag i dag» (kl. 15, eller en time før middagen hvis den er tidligere).
 */
export function planReminders(input: {
  plan: MealPlanEntry[];
  recipes: Recipe[];
  inventory: FridgeItem[];
  /** Ids til lagre som er frysere. */
  freezerIds: string[];
  settings: Pick<Settings, 'remindEvening' | 'remindToday'>;
  now?: Date;
}): PlannedReminder[] {
  const { plan, recipes, inventory, freezerIds, settings } = input;
  const now = input.now ?? new Date();
  if (!settings.remindEvening && !settings.remindToday) return [];

  const freezer = inventory.filter((i) => i.place !== undefined && freezerIds.includes(i.place));
  const horizon = new Date(now.getTime() + HORIZON_DAYS * 86_400_000);
  const out: PlannedReminder[] = [];

  for (const entry of plan) {
    const when = new Date(entry.date);
    if (when <= now || when > horizon) continue;
    const recipe = recipes.find((r) => r.id === entry.recipeId);
    if (!recipe) continue;
    const servings = entry.servings ?? baseServings(recipe);

    if (settings.remindEvening) {
      const at = new Date(when.getFullYear(), when.getMonth(), when.getDate() - 1, 20, 0);
      if (at > now) {
        const frozen = freezer.filter((f) =>
          recipe.ingredients.some(
            (line) => matchLevel(parseIngredient(line).name, f.name) === 'match',
          ),
        );
        out.push({
          id: `evening-${entry.id}`,
          at,
          title: `I morgen: ${recipe.title}`,
          body: frozen.length
            ? `Husk å ta ut fra fryseren: ${frozen.map((f) => f.name).join(', ')}.`
            : 'Sjekk at du har det du trenger.',
        });
      }
    }

    if (settings.remindToday) {
      const afternoon = new Date(when.getFullYear(), when.getMonth(), when.getDate(), 15, 0);
      const hourBefore = new Date(when.getTime() - 3_600_000);
      const at = hourBefore < afternoon ? hourBefore : afternoon;
      if (at > now) {
        out.push({
          id: `today-${entry.id}`,
          at,
          title: `Middag i dag: ${recipe.title}`,
          body: `${servings} porsjoner.`,
        });
      }
    }
  }
  return out.sort((a, b) => a.at.getTime() - b.at.getTime());
}
