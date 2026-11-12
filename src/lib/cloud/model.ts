/**
 * Ren datamodell for synk: konverterer mellom appens lokale data og rader i databasen,
 * og beregner hva som er endret. Ingen nettverk eller lagring her, så alt kan testes.
 */
import type {
  FridgeItem,
  FridgeState,
  MealPlanEntry,
  Recipe,
  ShoppingExtra,
  ShoppingState,
  StorageDef,
} from '../types.ts';

export type ItemKind =
  'checked' | 'hidden' | 'override' | 'extra' | 'fridge' | 'storage' | 'recipeAdd' | 'setting';

export type StateItem = { kind: ItemKind; key: string; value: Record<string, unknown> };
export type StateRow = StateItem & { deleted: boolean };

export const itemId = (kind: ItemKind, key: string) => `${kind}::${key}`;

// ---------------------------------------------------------------------------
// Oppskrifter og plan
// ---------------------------------------------------------------------------

export type RecipeData = {
  title: string;
  servings?: string;
  sourceUrl?: string;
  ingredients: string[];
  steps: string[];
  /** Filnavn på bildene. Selve filene ligger i fillagringen, ikke i raden. */
  images: string[];
  createdAt: number;
  favorite?: boolean;
  minutes?: number;
  tags?: string[];
  notes?: string;
  rating?: number;
  lastCookedAt?: number;
  cookCount?: number;
};

const baseName = (uri: string) => uri.split('/').pop() ?? uri;

export function recipeToData(r: Recipe): RecipeData {
  return {
    title: r.title,
    servings: r.servings,
    sourceUrl: r.sourceUrl,
    ingredients: r.ingredients,
    steps: r.steps,
    images: r.images.map(baseName),
    createdAt: r.createdAt,
    favorite: r.favorite,
    minutes: r.minutes,
    tags: r.tags,
    notes: r.notes,
    rating: r.rating,
    lastCookedAt: r.lastCookedAt,
    cookCount: r.cookCount,
  };
}

export function dataToRecipe(id: string, d: RecipeData, imageDir: string): Recipe {
  return {
    id,
    title: d.title,
    servings: d.servings,
    sourceUrl: d.sourceUrl,
    ingredients: d.ingredients ?? [],
    steps: d.steps ?? [],
    images: (d.images ?? []).map((name) => `${imageDir}/${name}`),
    createdAt: d.createdAt ?? 0,
    favorite: d.favorite,
    minutes: d.minutes,
    tags: d.tags,
    notes: d.notes,
    rating: d.rating,
    lastCookedAt: d.lastCookedAt,
    cookCount: d.cookCount,
  };
}

export type PlanData = { recipeId: string; date: string; servings?: number };

/** Kalenderhendelsen ligger på hver enkelt telefon og deles ikke. */
export const planToData = (e: MealPlanEntry): PlanData => ({
  recipeId: e.recipeId,
  date: e.date,
  servings: e.servings,
});

export const dataToPlan = (id: string, d: PlanData, existing?: MealPlanEntry): MealPlanEntry => ({
  id,
  recipeId: d.recipeId,
  date: d.date,
  servings: d.servings,
  calendarEventId: existing?.calendarEventId,
});

// ---------------------------------------------------------------------------
// Handleliste og kjøleskap som enkeltrader
// ---------------------------------------------------------------------------

export function stateToItems(shopping: ShoppingState, fridge: FridgeState): Map<string, StateItem> {
  const m = new Map<string, StateItem>();
  const put = (kind: ItemKind, key: string, value: Record<string, unknown> = {}) =>
    m.set(itemId(kind, key), { kind, key, value });
  for (const k of shopping.checked) put('checked', k);
  for (const k of shopping.hidden) put('hidden', k);
  for (const [k, text] of Object.entries(shopping.overrides)) put('override', k, { text });
  for (const e of shopping.extras) put('extra', e.id, { text: e.text, checked: e.checked });
  for (const i of fridge.items) {
    put('fridge', i.id, { name: i.name, place: i.place ?? 'fridge', expires: i.expires ?? null });
  }
  for (const r of shopping.fromRecipes)
    put('recipeAdd', r.id, { recipeId: r.recipeId, servings: r.servings });
  for (const x of fridge.storages)
    put('storage', x.id, { name: x.name, freezer: Boolean(x.freezer) });
  put('setting', 'assumeStaples', { value: fridge.assumeStaples });
  return m;
}

/** Bruker én rad fra databasen på lokal handleliste og kjøleskap. */
export function applyItem(
  shopping: ShoppingState,
  fridge: FridgeState,
  row: StateRow,
): { shopping: ShoppingState; fridge: FridgeState } {
  const { kind, key, value, deleted } = row;
  switch (kind) {
    case 'checked':
    case 'hidden': {
      const field = kind;
      const has = shopping[field].includes(key);
      if (deleted ? !has : has) return { shopping, fridge };
      return {
        shopping: {
          ...shopping,
          [field]: deleted ? shopping[field].filter((k) => k !== key) : [...shopping[field], key],
        },
        fridge,
      };
    }
    case 'override': {
      const overrides = { ...shopping.overrides };
      if (deleted) delete overrides[key];
      else overrides[key] = String(value.text ?? '');
      return { shopping: { ...shopping, overrides }, fridge };
    }
    case 'extra': {
      const others = shopping.extras.filter((e) => e.id !== key);
      if (deleted) return { shopping: { ...shopping, extras: others }, fridge };
      const next: ShoppingExtra = {
        id: key,
        text: String(value.text ?? ''),
        checked: Boolean(value.checked),
      };
      const old = shopping.extras.find((e) => e.id === key);
      const extras = old
        ? shopping.extras.map((e) => (e.id === key ? next : e))
        : [...others, next];
      return { shopping: { ...shopping, extras }, fridge };
    }
    case 'fridge': {
      const others = fridge.items.filter((i) => i.id !== key);
      if (deleted) return { shopping, fridge: { ...fridge, items: others } };
      const next: FridgeItem = {
        id: key,
        name: String(value.name ?? ''),
        place: (value.place as FridgeItem['place']) ?? 'fridge',
        ...(value.expires ? { expires: String(value.expires) } : {}),
      };
      const old = fridge.items.find((i) => i.id === key);
      const items = old ? fridge.items.map((i) => (i.id === key ? next : i)) : [...others, next];
      return { shopping, fridge: { ...fridge, items } };
    }
    case 'storage': {
      const others = fridge.storages.filter((x) => x.id !== key);
      if (deleted) {
        // Aldri la en husholdning stå uten lager.
        if (others.length === 0) return { shopping, fridge };
        return {
          shopping,
          fridge: {
            ...fridge,
            storages: others,
            items: fridge.items.filter((i) => i.place !== key),
          },
        };
      }
      const next: StorageDef = {
        id: key,
        name: String(value.name ?? ''),
        ...(value.freezer ? { freezer: true } : {}),
      };
      const old = fridge.storages.find((x) => x.id === key);
      const storages = old
        ? fridge.storages.map((x) => (x.id === key ? next : x))
        : [...others, next];
      return { shopping, fridge: { ...fridge, storages } };
    }
    case 'recipeAdd': {
      const others = shopping.fromRecipes.filter((x) => x.id !== key);
      if (deleted) return { shopping: { ...shopping, fromRecipes: others }, fridge };
      const next = {
        id: key,
        recipeId: String(value.recipeId ?? ''),
        servings: Number(value.servings ?? 4),
      };
      const old = shopping.fromRecipes.find((x) => x.id === key);
      const fromRecipes = old
        ? shopping.fromRecipes.map((x) => (x.id === key ? next : x))
        : [...others, next];
      return { shopping: { ...shopping, fromRecipes }, fridge };
    }
    case 'setting': {
      if (key === 'assumeStaples' && !deleted) {
        return { shopping, fridge: { ...fridge, assumeStaples: Boolean(value.value) } };
      }
      return { shopping, fridge };
    }
  }
}

// ---------------------------------------------------------------------------
// Forskjeller
// ---------------------------------------------------------------------------

export type Diff<T> = { upserts: [string, T][]; removed: string[] };

/** Hva må sendes til serveren for at `synced` skal bli lik `next`? */
export function diffMaps<T>(synced: Map<string, T>, next: Map<string, T>): Diff<T> {
  const upserts: [string, T][] = [];
  for (const [k, v] of next) {
    const old = synced.get(k);
    if (old === undefined || JSON.stringify(old) !== JSON.stringify(v)) upserts.push([k, v]);
  }
  const removed = [...synced.keys()].filter((k) => !next.has(k));
  return { upserts, removed };
}

export const toMap = <T extends { id: string }, D>(list: T[], f: (x: T) => D) =>
  new Map<string, D>(list.map((x) => [x.id, f(x)]));
