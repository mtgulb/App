import { baseServings } from './ingredients.ts';
import type { Recipe } from './types.ts';

export type Settings = {
  /** Er antall voksne og barn satt av brukeren? Hvis ikke brukes oppskriftens egne porsjoner. */
  configured: boolean;
  adults: number;
  children: number;
  /** Hvor mye et barn spiser sammenlignet med en voksen. */
  childFactor: number;
  shoppingSort: 'recipe' | 'department';
  remindEvening: boolean;
  remindToday: boolean;
  clipboardHint: boolean;
  /** Foreslå oppskrifter ut fra det som ligger på lageret. */
  stockSuggestions: boolean;
};

export const DEFAULT_SETTINGS: Settings = {
  configured: false,
  adults: 2,
  children: 0,
  childFactor: 0.5,
  shoppingSort: 'recipe',
  remindEvening: false,
  remindToday: false,
  clipboardHint: true,
  stockSuggestions: true,
};

/** Antall porsjoner husholdningen trenger. Rundes opp, så ingen blir sultne. */
export const householdPortions = (s: Pick<Settings, 'adults' | 'children' | 'childFactor'>) =>
  Math.max(1, Math.ceil(s.adults + s.children * s.childFactor));

/** Standard antall porsjoner for en oppskrift: husholdningens, hvis den er satt, ellers oppskriftens egen. */
export const defaultServings = (s: Settings, recipe: Pick<Recipe, 'servings'>) =>
  s.configured ? householdPortions(s) : baseServings(recipe);

export const householdLabel = (s: Pick<Settings, 'adults' | 'children'>) =>
  `${s.adults} ${s.adults === 1 ? 'voksen' : 'voksne'}${s.children > 0 ? ` og ${s.children} ${s.children === 1 ? 'barn' : 'barn'}` : ''}`;
