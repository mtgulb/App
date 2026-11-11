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
};
