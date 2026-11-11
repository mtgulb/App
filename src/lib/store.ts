import Storage from 'expo-sqlite/kv-store';
import { useSyncExternalStore } from 'react';
import type {
  FridgeItem,
  FridgeState,
  MealPlanEntry,
  Recipe,
  ShoppingExtra,
  ShoppingState,
} from './types';

type State = {
  recipes: Recipe[];
  plan: MealPlanEntry[];
  shopping: ShoppingState;
  fridge: FridgeState;
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
    };
  } catch {
    return { checked: [], extras: [], hidden: [], overrides: {} };
  }
}

function loadFridge(): FridgeState {
  try {
    const raw = Storage.getItemSync('fridge');
    const v = raw ? (JSON.parse(raw) as Partial<FridgeState>) : {};
    return { items: v.items ?? [], assumeStaples: v.assumeStaples ?? true };
  } catch {
    return { items: [], assumeStaples: true };
  }
}

let state: State = {
  recipes: load<Recipe>('recipes'),
  plan: load<MealPlanEntry>('plan'),
  shopping: loadShopping(),
  fridge: loadFridge(),
};
const listeners = new Set<() => void>();

function commit(next: State) {
  if (next.recipes !== state.recipes) Storage.setItemSync('recipes', JSON.stringify(next.recipes));
  if (next.plan !== state.plan) Storage.setItemSync('plan', JSON.stringify(next.plan));
  if (next.fridge !== state.fridge) Storage.setItemSync('fridge', JSON.stringify(next.fridge));
  if (next.shopping !== state.shopping) {
    Storage.setItemSync('shopping', JSON.stringify(next.shopping));
  }
  state = next;
  listeners.forEach((l) => l());
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
    shopping: { ...state.shopping, checked: pruneChecked(gone) },
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

/** Legger til varer i kjøleskapet. Kommaseparert tekst gir flere varer; dubletter hoppes over. */
export function addFridgeItems(text: string) {
  const names = text
    .split(/[,\n]/)
    .map((n) => n.trim())
    .filter(Boolean);
  const existing = new Set(state.fridge.items.map((i) => i.name.toLowerCase()));
  const added: FridgeItem[] = [];
  for (const name of names) {
    if (existing.has(name.toLowerCase())) continue;
    existing.add(name.toLowerCase());
    added.push({ id: newId(), name });
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

export function renameFridgeItem(id: string, name: string) {
  const n = name.trim();
  if (!n) return;
  commit({
    ...state,
    fridge: {
      ...state.fridge,
      items: state.fridge.items.map((i) => (i.id === id ? { ...i, name: n } : i)),
    },
  });
}

export function clearFridge() {
  commit({ ...state, fridge: { ...state.fridge, items: [] } });
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
