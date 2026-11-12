import type { StoreProfile } from './departments.ts';
import { baseServings } from './ingredients.ts';
import type { Recipe } from './types.ts';
import { t } from '../i18n/index.ts';

export type Settings = {
  /** Er antall voksne og barn satt av brukeren? Hvis ikke brukes oppskriftens egne porsjoner. */
  configured: boolean;
  adults: number;
  children: number;
  /** Hvor mye et barn spiser sammenlignet med en voksen. */
  childFactor: number;
  shoppingSort: 'recipe' | 'department';
  /** Kvelden før middag. */
  remindEvening: boolean;
  /** Klokkeslett «HH:MM». */
  remindEveningTime: string;
  /** Samme dag som middagen. */
  remindToday: boolean;
  remindTodayTime: string;
  /** Varer på lageret som snart går ut (kun varer med utløpsdato). */
  remindExpiry: boolean;
  /** Varsle når det er så mange dager igjen. */
  expiryDays: number;
  expiryTime: string;
  /** Varsel når en tidtaker i kokemodus går ut. */
  timerAlerts: boolean;
  clipboardHint: boolean;
  /** Foreslå oppskrifter ut fra det som ligger på lageret. */
  stockSuggestions: boolean;
  /** Basisvarer brukeren alltid har (brukes når «basisvarer finnes» er på). */
  staples: string[];
  /** Egne butikker med egen avdelingsrekkefølge. */
  stores: StoreProfile[];
  /** Valgt butikk for sortering etter avdeling; null = standard. */
  activeStoreId: string | null;
};

export const DEFAULT_SETTINGS: Settings = {
  configured: false,
  adults: 2,
  children: 0,
  childFactor: 0.5,
  shoppingSort: 'recipe',
  remindEvening: false,
  remindEveningTime: '20:00',
  remindToday: false,
  remindTodayTime: '15:00',
  remindExpiry: false,
  expiryDays: 2,
  expiryTime: '09:00',
  timerAlerts: true,
  clipboardHint: true,
  stockSuggestions: true,
  staples: ['salt', 'pepper', 'vann', 'olje'],
  stores: [],
  activeStoreId: null,
};

/** Antall porsjoner husholdningen trenger. Rundes opp, så ingen blir sultne. */
export const householdPortions = (s: Pick<Settings, 'adults' | 'children' | 'childFactor'>) =>
  Math.max(1, Math.ceil(s.adults + s.children * s.childFactor));

/** Standard antall porsjoner for en oppskrift: husholdningens, hvis den er satt, ellers oppskriftens egen. */
export const defaultServings = (s: Settings, recipe: Pick<Recipe, 'servings'>) =>
  s.configured ? householdPortions(s) : baseServings(recipe);

export const householdLabel = (s: Pick<Settings, 'adults' | 'children'>) =>
  s.children > 0
    ? t('lib.householdWithChildren', {
        adults: t('lib.adults', { count: s.adults }),
        children: t('lib.children', { count: s.children }),
      })
    : t('lib.adults', { count: s.adults });
