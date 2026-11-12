export type Recipe = {
  id: string;
  title: string;
  sourceUrl?: string;
  servings?: string;
  ingredients: string[];
  steps: string[];
  images: string[];
  createdAt: number;
  /** Favoritt. */
  favorite?: boolean;
  /** Total tid i minutter. */
  minutes?: number;
  tags?: string[];
  /** Egne notater, f.eks. «litt mindre salt neste gang». */
  notes?: string;
  /** Vurdering 1–5. */
  rating?: number;
  lastCookedAt?: number;
  cookCount?: number;
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

/** En hel oppskrift lagt på handlelisten (uavhengig av middagsplanen). */
export type ShoppingRecipeAdd = { id: string; recipeId: string; servings: number };

export type ShoppingState = {
  /** Oppskrifter lagt direkte på handlelisten. */
  fromRecipes: ShoppingRecipeAdd[];
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
  /** Id til lageret varen ligger i. */
  place?: string;
  /** Valgfri utløpsdato, YYYY-MM-DD. */
  expires?: string;
};

/** Et lager brukeren selv oppretter: «Kjøleskap», «Fryser», «Kjeller» eller bare ett felles «Lager». */
export type StorageDef = {
  id: string;
  name: string;
  /** Fryser: brukes til påminnelser om å tine. */
  freezer?: boolean;
};

export type FridgeState = {
  items: FridgeItem[];
  storages: StorageDef[];
  /** Regn salt, pepper, vann og olje som alltid tilstede. */
  assumeStaples: boolean;
};
