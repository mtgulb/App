import { baseServings, parseIngredient } from './ingredients.ts';
import { matchLevel } from './pantry.ts';
import { daysUntil } from './inventory.ts';
import type { Settings } from './portions.ts';
import type { FridgeItem, MealPlanEntry, Recipe } from './types.ts';
import { t } from '../i18n/index.ts';

export type PlannedReminder = { id: string; at: Date; title: string; body: string };

/** «20:30» → [20, 30]. Ugyldig tekst gir reservetid. */
export function parseHm(hm: string, fallback: [number, number]): [number, number] {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hm);
  if (!m) return fallback;
  const h = +m[1];
  const min = +m[2];
  return h <= 23 && min <= 59 ? [h, min] : fallback;
}

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
  settings: Pick<
    Settings,
    'remindEvening' | 'remindEveningTime' | 'remindToday' | 'remindTodayTime'
  >;
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
      const [eh, em] = parseHm(settings.remindEveningTime, [20, 0]);
      const at = new Date(when.getFullYear(), when.getMonth(), when.getDate() - 1, eh, em);
      if (at > now) {
        const frozen = freezer.filter((f) =>
          recipe.ingredients.some(
            (line) => matchLevel(parseIngredient(line).name, f.name) === 'match',
          ),
        );
        out.push({
          id: `evening-${entry.id}`,
          at,
          title: t('notif.tomorrow', { title: recipe.title }),
          body: frozen.length
            ? t('notif.takeOutFreezer', { items: frozen.map((f) => f.name).join(', ') })
            : t('notif.checkSupplies'),
        });
      }
    }

    if (settings.remindToday) {
      const [th, tm] = parseHm(settings.remindTodayTime, [15, 0]);
      const afternoon = new Date(when.getFullYear(), when.getMonth(), when.getDate(), th, tm);
      const hourBefore = new Date(when.getTime() - 3_600_000);
      const at = hourBefore < afternoon ? hourBefore : afternoon;
      if (at > now) {
        out.push({
          id: `today-${entry.id}`,
          at,
          title: t('notif.today', { title: recipe.title }),
          body: t('notif.servings', { servings }),
        });
      }
    }
  }
  return out.sort((a, b) => a.at.getTime() - b.at.getTime());
}

/**
 * Varsler om varer som snart går ut. Bare varer der brukeren selv har lagt inn utløpsdato.
 * Ett varsel per dag, med navnene på varene.
 */
export function planExpiryReminders(input: {
  inventory: FridgeItem[];
  settings: Pick<Settings, 'remindExpiry' | 'expiryDays' | 'expiryTime'>;
  now?: Date;
}): PlannedReminder[] {
  const { inventory, settings } = input;
  const now = input.now ?? new Date();
  if (!settings.remindExpiry) return [];
  const [h, m] = parseHm(settings.expiryTime, [9, 0]);
  const byDay = new Map<string, { at: Date; names: string[] }>();
  for (const item of inventory) {
    if (!item.expires) continue;
    const [y, mo, d] = item.expires.split('-').map(Number);
    const at = new Date(y, mo - 1, d - settings.expiryDays, h, m);
    // Hopp over varsler i fortiden og varer som allerede har gått ut.
    if (at <= now || daysUntil(item.expires, now) < 0) continue;
    if (at.getTime() - now.getTime() > HORIZON_DAYS * 86_400_000 * 6) continue;
    const key = `${at.getFullYear()}-${at.getMonth()}-${at.getDate()}`;
    const entry = byDay.get(key) ?? { at, names: [] };
    entry.names.push(item.name);
    byDay.set(key, entry);
  }
  return [...byDay.entries()]
    .map(([key, { at, names }]) => ({
      id: `expiry-${key}`,
      at,
      title:
        names.length === 1 ? t('notif.expiresOne', { name: names[0] }) : t('notif.expiresMany'),
      body:
        names.length === 1
          ? t('notif.useSoon')
          : names.length > 5
            ? t('notif.expiryListMore', {
                items: names.slice(0, 5).join(', '),
                rest: names.length - 5,
              })
            : t('notif.expiryList', { items: names.join(', ') }),
    }))
    .sort((a, b) => a.at.getTime() - b.at.getTime());
}
