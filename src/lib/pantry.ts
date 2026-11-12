import { parseIngredient } from './ingredients.ts';
import { normalizeTokens } from './synonyms.ts';
import type { Recipe } from './types';

/** Varer vi regner med at de fleste alltid har hjemme. */
const STAPLES = ['salt', 'pepper', 'vann', 'olje', 'olivenolje', 'rapsolje', 'matolje'];

export const tokens = normalizeTokens;

/** Kjøttstykker, fiskestykker og former som kan henges på en råvare: laks → laksefilet. */
const CUTS = new Set([
  'filet',
  'fillet',
  'filett',
  'lårfilet',
  'indrefilet',
  'innerfilet',
  'ytrefilet',
  'ryggfilet',
  'mørbrad',
  'bryst',
  'lår',
  'innerlår',
  'kotelett',
  'biff',
  'steak',
  'skive',
  'bit',
  'kjøtt',
  'deig',
  'farse',
  'ribbe',
  'strimmel',
]);

/** Er `rest` en kjent bit/form, evt. med bindebokstav (laks+e+filet, svin+s+kotelett)? */
const isCut = (rest: string) =>
  CUTS.has(rest) || (rest.length > 1 && 'es'.includes(rest[0]) && CUTS.has(rest.slice(1)));

/** «laksefilet» er laks + filet. Gjelder begge veier. */
function isCompound(a: string, b: string): boolean {
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  return (
    short.length >= 3 &&
    long.length > short.length &&
    long.startsWith(short) &&
    isCut(long.slice(short.length))
  );
}

/** «rødløk» har «løk» som hovedord, men er ikke nødvendigvis det samme: lignende, ikke treff. */
function isHeadVariant(a: string, b: string): boolean {
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  return short.length >= 3 && long.length - short.length >= 3 && long.endsWith(short);
}

export type MatchLevel = 'match' | 'similar' | null;

/** Hvor godt passer en ingrediens til en vare i kjøleskapet? */
export function matchLevel(ingredientName: string, fridgeName: string): MatchLevel {
  const ing = tokens(ingredientName);
  const fr = tokens(fridgeName);
  if (ing.length === 0 || fr.length === 0) return null;
  if (fr.every((t) => ing.includes(t)) || ing.every((t) => fr.includes(t))) return 'match';
  if (ing.some((i) => fr.some((f) => isCompound(i, f)))) return 'match';
  if (ing.some((i) => fr.some((f) => isHeadVariant(i, f)))) return 'similar';
  return null;
}

/** Sikkert treff (synonym, samme ord eller samme vare i annen form). */
export const matches = (ingredientName: string, fridgeName: string) =>
  matchLevel(ingredientName, fridgeName) === 'match';

export function isStaple(name: string): boolean {
  const t = tokens(name);
  return t.length > 0 && t.every((w) => STAPLES.includes(w));
}

export type RecipeFit = {
  recipe: Recipe;
  total: number;
  /** Ingredienser du har. */
  have: string[];
  /** Ingredienser der du har noe lignende (f.eks. løk når oppskriften sier rødløk). */
  similar: { line: string; fridge: string }[];
  /** Ingrediensene som mangler, som originale linjer. */
  missing: string[];
  /** Varer som snart går ut og som denne oppskriften bruker opp. */
  usesSoon: string[];
};

/**
 * `assumeStaples` regner salt, pepper, vann og olje som tilstede. Brukes bare i kjøleskap-visningen,
 * ikke på oppskriftssiden.
 */
export function analyzeRecipe(
  recipe: Recipe,
  fridge: string[],
  assumeStaples: boolean,
  soon: string[] = [],
): RecipeFit {
  const have: string[] = [];
  const similar: { line: string; fridge: string }[] = [];
  const missing: string[] = [];
  for (const line of recipe.ingredients) {
    const p = parseIngredient(line);
    if (
      fridge.some((f) => matchLevel(p.name, f) === 'match') ||
      (assumeStaples && isStaple(p.name))
    ) {
      have.push(line);
      continue;
    }
    const near = fridge.find((f) => matchLevel(p.name, f) === 'similar');
    if (near) similar.push({ line, fridge: near });
    else missing.push(line);
  }
  const usesSoon = soon.filter((name) =>
    recipe.ingredients.some((line) => matchLevel(parseIngredient(line).name, name) === 'match'),
  );
  return { recipe, total: recipe.ingredients.length, have, similar, missing, usesSoon };
}

/**
 * Oppskrifter sortert etter færrest manglende ingredienser (lignende teller halvt).
 * Oppskrifter som bruker opp noe som snart går ut, løftes litt frem.
 */
export function rankRecipes(
  recipes: Recipe[],
  fridge: string[],
  assumeStaples: boolean,
  soon: string[] = [],
): RecipeFit[] {
  const gap = (f: RecipeFit) => f.missing.length + f.similar.length * 0.5 - f.usesSoon.length * 0.6;
  return recipes
    .filter((r) => r.ingredients.length > 0)
    .map((r) => analyzeRecipe(r, fridge, assumeStaples, soon))
    .sort(
      (a, b) =>
        gap(a) - gap(b) ||
        b.have.length / b.total - a.have.length / a.total ||
        a.recipe.title.localeCompare(b.recipe.title, 'nb'),
    );
}
