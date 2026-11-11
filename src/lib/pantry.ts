import { parseIngredient } from './ingredients.ts';
import { normalizeTokens } from './synonyms.ts';
import type { Recipe } from './types';

/** Varer vi regner med at de fleste alltid har hjemme. */
const STAPLES = ['salt', 'pepper', 'vann', 'olje', 'olivenolje', 'rapsolje', 'matolje'];

export const tokens = normalizeTokens;

const compoundMatch = (a: string, b: string) => {
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  return short.length >= 5 && long.startsWith(short);
};

/** Passer en ingrediens til en vare i kjøleskapet? */
export function matches(ingredientName: string, fridgeName: string): boolean {
  const ing = tokens(ingredientName);
  const fr = tokens(fridgeName);
  if (ing.length === 0 || fr.length === 0) return false;
  if (fr.every((t) => ing.includes(t)) || ing.every((t) => fr.includes(t))) return true;
  return ing.some((i) => fr.some((f) => compoundMatch(i, f)));
}

export function isStaple(name: string): boolean {
  const t = tokens(name);
  return t.length > 0 && t.every((w) => STAPLES.includes(w));
}

export type RecipeFit = {
  recipe: Recipe;
  total: number;
  have: string[];
  /** Ingrediensene som mangler, som originale linjer. */
  missing: string[];
};

export function analyzeRecipe(recipe: Recipe, fridge: string[], assumeStaples: boolean): RecipeFit {
  const have: string[] = [];
  const missing: string[] = [];
  for (const line of recipe.ingredients) {
    const p = parseIngredient(line);
    const covered = (assumeStaples && isStaple(p.name)) || fridge.some((f) => matches(p.name, f));
    (covered ? have : missing).push(line);
  }
  return { recipe, total: recipe.ingredients.length, have, missing };
}

/** Oppskrifter sortert etter færrest manglende ingredienser. */
export function rankRecipes(
  recipes: Recipe[],
  fridge: string[],
  assumeStaples: boolean,
): RecipeFit[] {
  return recipes
    .filter((r) => r.ingredients.length > 0)
    .map((r) => analyzeRecipe(r, fridge, assumeStaples))
    .sort(
      (a, b) =>
        a.missing.length - b.missing.length ||
        b.have.length / b.total - a.have.length / a.total ||
        a.recipe.title.localeCompare(b.recipe.title, 'nb'),
    );
}
