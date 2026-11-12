/** «Nylig slettet»: slettede oppskrifter (med middagene sine) ligger i 30 dager før de fjernes for godt. */
import type { MealPlanEntry, Recipe } from './types.ts';

export const TRASH_DAYS = 30;
const DAY = 24 * 60 * 60 * 1000;

export type TrashItem = { recipe: Recipe; plan: MealPlanEntry[]; deletedAt: number };

export const pruneTrash = (list: TrashItem[], now: number): TrashItem[] =>
  list.filter((x) => now - x.deletedAt < TRASH_DAYS * DAY);

export function addToTrash(
  list: TrashItem[],
  recipe: Recipe,
  plan: MealPlanEntry[],
  now: number,
): TrashItem[] {
  return pruneTrash(
    [{ recipe, plan, deletedAt: now }, ...list.filter((x) => x.recipe.id !== recipe.id)],
    now,
  );
}

export const daysLeft = (item: TrashItem, now: number): number =>
  Math.max(0, Math.ceil(TRASH_DAYS - (now - item.deletedAt) / DAY));

/** Tar en oppskrift ut av papirkurven. Kalenderkoblingen er borte, så den fjernes. */
export function takeFromTrash(
  list: TrashItem[],
  recipeId: string,
): { rest: TrashItem[]; item: TrashItem | null } {
  const item = list.find((x) => x.recipe.id === recipeId) ?? null;
  return {
    rest: list.filter((x) => x.recipe.id !== recipeId),
    item: item && { ...item, plan: item.plan.map(({ calendarEventId: _c, ...p }) => p) },
  };
}
