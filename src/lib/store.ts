import Storage from 'expo-sqlite/kv-store';
import { useSyncExternalStore } from 'react';
import { DEPARTMENTS, normalizeOrder } from './departments';
import { migrateFridge } from './inventory';
import { DEFAULT_SETTINGS, type Settings } from './portions';
import type {
  FridgeItem,
  FridgeState,
  MealPlanEntry,
  Recipe,
  ShoppingExtra,
  ShoppingState,
} from './types';

export type State = {
  recipes: Recipe[];
  plan: MealPlanEntry[];
  shopping: ShoppingState;
  fridge: FridgeState;
  settings: Settings;
};

function load<T>(key: string): T[] {
  try {
    const raw = Storage.getItemSync(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function loadShopping(): ShoppingState {
  try {
    const raw = Storage.getItemSync('shopping');
    const v = raw ? (JSON.parse(raw) as Partial<ShoppingState>) : {};
    return {
      checked: v.checked ?? [],
      extras: v.extras ?? [],
      hidden: v.hidden ?? [],
      overrides: v.overrides ?? {},
      fromRecipes: v.fromRecipes ?? [],
    };
  } catch {
    return { checked: [], extras: [], hidden: [], overrides: {}, fromRecipes: [] };
  }
}

function loadFridge(): FridgeState {
  try {
    const raw = Storage.getItemSync('fridge');
    return migrateFridge(raw ? (JSON.parse(raw) as Partial<FridgeState>) : {});
  } catch {
    return migrateFridge({});
  }
}

function loadSettings(): Settings {
  try {
    const raw = Storage.getItemSync('settings');
    return { ...DEFAULT_SETTINGS, ...(raw ? (JSON.parse(raw) as Partial<Settings>) : {}) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

let state: State = {
  recipes: load<Recipe>('recipes'),
  plan: load<MealPlanEntry>('plan'),
  shopping: loadShopping(),
  fridge: loadFridge(),
  settings: loadSettings(),
};
const listeners = new Set<() => void>();
type ChangeListener = (prev: State, next: State, remote: boolean) => void;
const changeListeners = new Set<ChangeListener>();

function commit(next: State, remote = false) {
  if (next.recipes !== state.recipes) Storage.setItemSync('recipes', JSON.stringify(next.recipes));
  if (next.plan !== state.plan) Storage.setItemSync('plan', JSON.stringify(next.plan));
  if (next.fridge !== state.fridge) Storage.setItemSync('fridge', JSON.stringify(next.fridge));
  if (next.settings !== state.settings) {
    Storage.setItemSync('settings', JSON.stringify(next.settings));
  }
  if (next.shopping !== state.shopping) {
    Storage.setItemSync('shopping', JSON.stringify(next.shopping));
  }
  const prev = state;
  state = next;
  listeners.forEach((l) => l());
  changeListeners.forEach((l) => l(prev, next, remote));
}

export const getState = () => state;

/** Lytter på alle endringer. `remote` er true når endringen kom fra synk, ikke fra brukeren. */
export function onStateChange(fn: ChangeListener): () => void {
  changeListeners.add(fn);
  return () => changeListeners.delete(fn);
}

/** Bruker en endring som kom fra synk. Sendes ikke tilbake til serveren. */
export function applyRemote(update: (s: State) => State) {
  const next = update(state);
  if (next !== state) commit(next, true);
}

export function useStore(): State {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
  );
}

export const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export function addRecipe(r: Omit<Recipe, 'id' | 'createdAt'>): Recipe {
  const recipe: Recipe = { ...r, id: newId(), createdAt: Date.now() };
  commit({ ...state, recipes: [recipe, ...state.recipes] });
  return recipe;
}

export function toggleFavorite(id: string) {
  commit({
    ...state,
    recipes: state.recipes.map((r) => (r.id === id ? { ...r, favorite: !r.favorite } : r)),
  });
}

/** Logger at oppskriften er laget nå. */
export function markCooked(id: string) {
  commit({
    ...state,
    recipes: state.recipes.map((r) =>
      r.id === id ? { ...r, lastCookedAt: Date.now(), cookCount: (r.cookCount ?? 0) + 1 } : r,
    ),
  });
}

/** Legger alle ingredientene i en oppskrift på handlelisten. Oppdaterer porsjonene hvis den allerede ligger der. */
export function addRecipeToShopping(recipeId: string, servings: number) {
  const existing = state.shopping.fromRecipes.find((x) => x.recipeId === recipeId);
  const fromRecipes = existing
    ? state.shopping.fromRecipes.map((x) => (x.recipeId === recipeId ? { ...x, servings } : x))
    : [...state.shopping.fromRecipes, { id: newId(), recipeId, servings }];
  commit({ ...state, shopping: { ...state.shopping, fromRecipes } });
}

export function removeRecipeFromShopping(id: string) {
  commit({
    ...state,
    shopping: {
      ...state.shopping,
      fromRecipes: state.shopping.fromRecipes.filter((x) => x.id !== id),
    },
  });
}

export function updateRecipe(id: string, patch: Partial<Omit<Recipe, 'id' | 'createdAt'>>) {
  commit({ ...state, recipes: state.recipes.map((r) => (r.id === id ? { ...r, ...patch } : r)) });
}

const pruneChecked = (entryIds: string[]) =>
  state.shopping.checked.filter((k) => !entryIds.some((id) => k.startsWith(`${id}|`)));

export function deleteRecipe(id: string) {
  const gone = state.plan.filter((p) => p.recipeId === id).map((p) => p.id);
  commit({
    ...state,
    recipes: state.recipes.filter((r) => r.id !== id),
    plan: state.plan.filter((p) => p.recipeId !== id),
    shopping: {
      ...state.shopping,
      checked: pruneChecked(gone),
      fromRecipes: state.shopping.fromRecipes.filter((x) => x.recipeId !== id),
    },
  });
}

export function addPlanEntry(e: Omit<MealPlanEntry, 'id'>): MealPlanEntry {
  const entry = { ...e, id: newId() };
  commit({ ...state, plan: [...state.plan, entry] });
  return entry;
}

export function removePlanEntry(id: string) {
  commit({
    ...state,
    plan: state.plan.filter((p) => p.id !== id),
    shopping: { ...state.shopping, checked: pruneChecked([id]) },
  });
}

export function setEntryServings(id: string, servings: number) {
  commit({
    ...state,
    plan: state.plan.map((p) => (p.id === id ? { ...p, servings } : p)),
  });
}

export function toggleChecked(key: string) {
  const { checked } = state.shopping;
  commit({
    ...state,
    shopping: {
      ...state.shopping,
      checked: checked.includes(key) ? checked.filter((k) => k !== key) : [...checked, key],
    },
  });
}

export function addExtra(text: string) {
  const t = text.trim();
  if (!t) return;
  const extra: ShoppingExtra = { id: newId(), text: t, checked: false };
  commit({ ...state, shopping: { ...state.shopping, extras: [...state.shopping.extras, extra] } });
}

export function toggleExtra(id: string) {
  commit({
    ...state,
    shopping: {
      ...state.shopping,
      extras: state.shopping.extras.map((e) => (e.id === id ? { ...e, checked: !e.checked } : e)),
    },
  });
}

export function removeExtra(id: string) {
  commit({
    ...state,
    shopping: { ...state.shopping, extras: state.shopping.extras.filter((e) => e.id !== id) },
  });
}

export function updateExtra(id: string, text: string) {
  const t = text.trim();
  if (!t) return;
  commit({
    ...state,
    shopping: {
      ...state.shopping,
      extras: state.shopping.extras.map((e) => (e.id === id ? { ...e, text: t } : e)),
    },
  });
}

/** Marker en vare som «har fra før» – den skjules fra handlelisten. */
export function hideItem(key: string) {
  const { hidden } = state.shopping;
  if (hidden.includes(key)) return;
  commit({ ...state, shopping: { ...state.shopping, hidden: [...hidden, key] } });
}

export function restoreItem(key: string) {
  commit({
    ...state,
    shopping: { ...state.shopping, hidden: state.shopping.hidden.filter((k) => k !== key) },
  });
}

/** Egen tekst for en sammenslått vare. Tom tekst fjerner endringen. */
export function setOverride(key: string, text: string) {
  const overrides = { ...state.shopping.overrides };
  if (text.trim()) overrides[key] = text.trim();
  else delete overrides[key];
  commit({ ...state, shopping: { ...state.shopping, overrides } });
}

/** Tømmer hele handlelisten: oppskrifter, egne varer, avkrysninger, «har fra før» og endringer. */
export function clearShopping() {
  commit({
    ...state,
    shopping: { checked: [], extras: [], hidden: [], overrides: {}, fromRecipes: [] },
  });
}

/** Angrer alle avkrysninger. */
export function resetShopping() {
  commit({
    ...state,
    shopping: {
      ...state.shopping,
      checked: [],
      extras: state.shopping.extras.map((e) => ({ ...e, checked: false })),
    },
  });
}

/** Fjerner handlede egne varer fra listen. */
export function removeCheckedExtras() {
  commit({
    ...state,
    shopping: { ...state.shopping, extras: state.shopping.extras.filter((e) => !e.checked) },
  });
}

/** Legger til varer på lager. Kommaseparert tekst gir flere varer; dubletter på samme sted hoppes over. */
export function addFridgeItems(
  text: string,
  opts: { place?: string; expires?: string; product?: string } = {},
) {
  const place = opts.place ?? state.fridge.storages[0].id;
  const names = text
    .split(/[,\n]/)
    .map((n) => n.trim())
    .filter(Boolean);
  const existing = new Set(state.fridge.items.map((i) => `${i.place}|${i.name.toLowerCase()}`));
  const added: FridgeItem[] = [];
  for (const name of names) {
    const key = `${place}|${name.toLowerCase()}`;
    if (existing.has(key)) continue;
    existing.add(key);
    added.push({
      id: newId(),
      name,
      place,
      ...(opts.expires ? { expires: opts.expires } : {}),
      ...(opts.product && names.length === 1 ? { product: opts.product } : {}),
    });
  }
  if (added.length === 0) return;
  commit({ ...state, fridge: { ...state.fridge, items: [...state.fridge.items, ...added] } });
}

export function removeFridgeItem(id: string) {
  commit({
    ...state,
    fridge: { ...state.fridge, items: state.fridge.items.filter((i) => i.id !== id) },
  });
}

/** Endrer navn, sted eller utløpsdato. `expires: null` fjerner datoen. */
export function updateFridgeItem(
  id: string,
  patch: { name?: string; place?: string; expires?: string | null },
) {
  commit({
    ...state,
    fridge: {
      ...state.fridge,
      items: state.fridge.items.map((i) => {
        if (i.id !== id) return i;
        const next: FridgeItem = { ...i };
        if (patch.name !== undefined && patch.name.trim()) next.name = patch.name.trim();
        if (patch.place) next.place = patch.place;
        if (patch.expires === null) delete next.expires;
        else if (patch.expires) next.expires = patch.expires;
        return next;
      }),
    },
  });
}

export function clearFridge(place?: string) {
  commit({
    ...state,
    fridge: {
      ...state.fridge,
      items: place ? state.fridge.items.filter((i) => i.place !== place) : [],
    },
  });
}

/** Oppretter et nytt lager. Returnerer id. */
export function addStorage(name: string, freezer = false): string | null {
  const n = name.trim();
  if (!n) return null;
  const id = newId();
  commit({
    ...state,
    fridge: {
      ...state.fridge,
      storages: [...state.fridge.storages, { id, name: n, ...(freezer ? { freezer: true } : {}) }],
    },
  });
  return id;
}

export function updateStorage(id: string, patch: { name?: string; freezer?: boolean }) {
  commit({
    ...state,
    fridge: {
      ...state.fridge,
      storages: state.fridge.storages.map((x) => {
        if (x.id !== id) return x;
        const next = { ...x };
        if (patch.name?.trim()) next.name = patch.name.trim();
        if (patch.freezer !== undefined) {
          if (patch.freezer) next.freezer = true;
          else delete next.freezer;
        }
        return next;
      }),
    },
  });
}

/** Sletter et lager og varene i det. Det siste lageret kan ikke slettes. */
export function removeStorage(id: string): boolean {
  if (state.fridge.storages.length <= 1) return false;
  commit({
    ...state,
    fridge: {
      ...state.fridge,
      storages: state.fridge.storages.filter((x) => x.id !== id),
      items: state.fridge.items.filter((i) => i.place !== id),
    },
  });
  return true;
}

/** Oppretter en butikk med standard rekkefølge. Returnerer id. */
export function addStoreProfile(name: string): string | null {
  const n = name.trim();
  if (!n) return null;
  const id = newId();
  commit({
    ...state,
    settings: {
      ...state.settings,
      stores: [...state.settings.stores, { id, name: n, order: [...DEPARTMENTS] }],
      activeStoreId: id,
    },
  });
  return id;
}

export function updateStoreProfile(id: string, patch: { name?: string; order?: string[] }) {
  commit({
    ...state,
    settings: {
      ...state.settings,
      stores: state.settings.stores.map((x) =>
        x.id === id
          ? {
              ...x,
              name: patch.name?.trim() ? patch.name.trim() : x.name,
              order: patch.order ? normalizeOrder(patch.order) : x.order,
            }
          : x,
      ),
    },
  });
}

export function removeStoreProfile(id: string) {
  commit({
    ...state,
    settings: {
      ...state.settings,
      stores: state.settings.stores.filter((x) => x.id !== id),
      activeStoreId: state.settings.activeStoreId === id ? null : state.settings.activeStoreId,
    },
  });
}

/** Legger til basisvarer (kommaseparert). Dubletter hoppes over. */
export function addStaples(text: string) {
  const have = new Set(state.settings.staples.map((x) => x.toLowerCase()));
  const added: string[] = [];
  for (const raw of text.split(/[,\n]/)) {
    const n = raw.trim().toLowerCase();
    if (n && !have.has(n)) {
      have.add(n);
      added.push(n);
    }
  }
  if (added.length) {
    commit({
      ...state,
      settings: { ...state.settings, staples: [...state.settings.staples, ...added] },
    });
  }
}

export function removeStaple(name: string) {
  commit({
    ...state,
    settings: { ...state.settings, staples: state.settings.staples.filter((x) => x !== name) },
  });
}

export function resetStaples() {
  commit({ ...state, settings: { ...state.settings, staples: [...DEFAULT_SETTINGS.staples] } });
}

export function updateSettings(patch: Partial<Settings>) {
  commit({ ...state, settings: { ...state.settings, ...patch } });
}

export function setAssumeStaples(value: boolean) {
  commit({ ...state, fridge: { ...state.fridge, assumeStaples: value } });
}

/** Legger varer på handlelisten som egne varer. Hopper over det som allerede står der. */
export function addExtras(texts: string[]) {
  const have = new Set(state.shopping.extras.map((e) => e.text.toLowerCase()));
  const added: ShoppingExtra[] = [];
  for (const raw of texts) {
    const text = raw.trim();
    if (!text || have.has(text.toLowerCase())) continue;
    have.add(text.toLowerCase());
    added.push({ id: newId(), text, checked: false });
  }
  if (added.length === 0) return;
  commit({
    ...state,
    shopping: { ...state.shopping, extras: [...state.shopping.extras, ...added] },
  });
}

export const getRecipe = (id: string) => state.recipes.find((r) => r.id === id);
export const getPlanEntry = (id: string) => state.plan.find((p) => p.id === id);
