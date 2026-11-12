import { parseIngredient } from './ingredients.ts';
import { matches } from './pantry.ts';
import type { Recipe } from './types.ts';

export type SortMode = 'newest' | 'lastCooked' | 'rating' | 'time' | 'alpha';

export const SORT_LABELS: Record<SortMode, string> = {
  newest: 'Nyeste',
  lastCooked: 'Sist laget',
  rating: 'Best vurdert',
  time: 'Raskest',
  alpha: 'A–Å',
};

export type RecipeFilters = {
  query: string;
  favoritesOnly: boolean;
  /** Maks tid i minutter; null = ingen grense. Oppskrifter uten oppgitt tid utelates når grense er satt. */
  maxMinutes: number | null;
  tag: string | null;
};

export const NO_FILTERS: RecipeFilters = {
  query: '',
  favoritesOnly: false,
  maxMinutes: null,
  tag: null,
};

export const TIME_OPTIONS = [15, 30, 45, 60] as const;

export const hasActiveFilters = (f: RecipeFilters) =>
  f.favoritesOnly || f.maxMinutes !== null || f.tag !== null || f.query.trim() !== '';

export function filterRecipes(recipes: Recipe[], f: RecipeFilters): Recipe[] {
  const q = f.query.trim().toLowerCase();
  return recipes.filter((r) => {
    if (f.favoritesOnly && !r.favorite) return false;
    if (f.maxMinutes !== null && !(r.minutes !== undefined && r.minutes <= f.maxMinutes))
      return false;
    if (f.tag !== null && !(r.tags ?? []).includes(f.tag)) return false;
    if (q) {
      const hit =
        r.title.toLowerCase().includes(q) ||
        // Også synonymer og sammensatte ord: «gulrot» finner «gulrøtter», «laks» finner «laksefilet».
        r.ingredients.some(
          (i) => i.toLowerCase().includes(q) || matches(parseIngredient(i).name, q),
        ) ||
        (r.tags ?? []).some((t) => t.includes(q));
      if (!hit) return false;
    }
    return true;
  });
}

export function sortRecipes(recipes: Recipe[], mode: SortMode): Recipe[] {
  const byTitle = (a: Recipe, b: Recipe) => a.title.localeCompare(b.title, 'nb');
  const list = [...recipes];
  switch (mode) {
    case 'newest':
      return list.sort((a, b) => b.createdAt - a.createdAt || byTitle(a, b));
    case 'lastCooked':
      return list.sort((a, b) => (b.lastCookedAt ?? 0) - (a.lastCookedAt ?? 0) || byTitle(a, b));
    case 'rating':
      return list.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || byTitle(a, b));
    case 'time':
      return list.sort(
        (a, b) => (a.minutes ?? Infinity) - (b.minutes ?? Infinity) || byTitle(a, b),
      );
    case 'alpha':
      return list.sort(byTitle);
  }
}

/** Alle tagger i bruk, vanligste først. */
export function allTags(recipes: Recipe[]): string[] {
  const count = new Map<string, number>();
  for (const r of recipes) for (const t of r.tags ?? []) count.set(t, (count.get(t) ?? 0) + 1);
  return [...count.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'nb'))
    .map(([t]) => t);
}

/** «Hverdag, Barnevennlig» → ['hverdag', 'barnevennlig'] */
export function parseTags(input: string): string[] {
  return [
    ...new Set(
      input
        .split(/[,\n]/)
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean),
    ),
  ];
}

export function formatMinutes(m: number): string {
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest === 0 ? `${h} t` : `${h} t ${rest} min`;
}
