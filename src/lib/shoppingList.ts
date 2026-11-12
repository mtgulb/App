import { baseServings, mergeIngredients, parseIngredient, type MergedItem } from './ingredients.ts';
import type { Recipe, ShoppingRecipeAdd } from './types.ts';

/**
 * Varene på handlelisten som kommer fra oppskrifter. Hver oppføring er én middag:
 * legges samme oppskrift på to ganger, dobles ingrediensene (og like varer slås sammen).
 */
export function mergedFromRecipes(adds: ShoppingRecipeAdd[], recipes: Recipe[]): MergedItem[] {
  const items = adds.flatMap((add) => {
    const recipe = recipes.find((r) => r.id === add.recipeId);
    if (!recipe) return [];
    const factor = add.servings / baseServings(recipe);
    return recipe.ingredients.map((line) => ({ parsed: parseIngredient(line), factor }));
  });
  return mergeIngredients(items);
}

/** Hvor mange ganger ligger oppskriften på listen? */
export const timesOnList = (adds: ShoppingRecipeAdd[], recipeId: string) =>
  adds.filter((a) => a.recipeId === recipeId).length;
