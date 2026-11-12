export type Recipe = {
  id: string;
  title: string;
  sourceUrl?: string;
  servings?: string;
  ingredients: string[];
  steps: string[];
  images: string[];
  createdAt: number;
};

export type MealPlanEntry = {
  id: string;
  recipeId: string;
  /** Tidspunkt for middagen som ISO-tekst (f.eks. 2026-11-12T17:00:00.000Z). */
  date: string;
  /** ID til hendelsen i iPhone-kalenderen, hvis lagt inn. */
  calendarEventId?: string;
  /** Antall porsjoner denne dagen. Mangler = oppskriftens grunnlag. */
  servings?: number;
};

export type ShoppingExtra = { id: string; text: string; checked: boolean };

export type ShoppingState = {
  /** Nøkler på formen `${planId}|${ingrediensIndeks}` for avkryssede oppskriftsvarer. */
  checked: string[];
  extras: ShoppingExtra[];
  /** Nøkler for varer brukeren har fra før og ikke vil kjøpe. */
  hidden: string[];
  /** Egen tekst for sammenslåtte varer, nøkkel → tekst. */
  overrides: Record<string, string>;
};

export type FridgeItem = {
  id: string;
  name: string;
  /** Kjøleskap (standard), fryser eller skap. */
  place?: 'fridge' | 'freezer' | 'pantry';
  /** Valgfri utløpsdato, YYYY-MM-DD. */
  expires?: string;
};

export type FridgeState = {
  items: FridgeItem[];
  /** Regn salt, pepper, vann og olje som alltid tilstede. */
  assumeStaples: boolean;
};
