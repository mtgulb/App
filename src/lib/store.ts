import Storage from 'expo-sqlite/kv-store';
import { useSyncExternalStore } from 'react';
import type { MealPlanEntry, Recipe, ShoppingExtra, ShoppingState } from './types';

type State = { recipes: Recipe[]; plan: MealPlanEntry[]; shopping: ShoppingState };

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
    return { checked: v.checked ?? [], extras: v.extras ?? [] };
  } catch {
    return { checked: [], extras: [] };
  }
}

let state: State = {
  recipes: load<Recipe>('recipes'),
  plan: load<MealPlanEntry>('plan'),
  shopping: loadShopping(),
};
const listeners = new Set<() => void>();

function commit(next: State) {
  if (next.recipes !== state.recipes) Storage.setItemSync('recipes', JSON.stringify(next.recipes));
  if (next.plan !== state.plan) Storage.setItemSync('plan', JSON.stringify(next.plan));
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

/** Fjerner avkryssede egne varer og nullstiller avkrysning på oppskriftsvarer. */
export function resetShopping() {
  commit({
    ...state,
    shopping: { checked: [], extras: state.shopping.extras.filter((e) => !e.checked) },
  });
}

export const getRecipe = (id: string) => state.recipes.find((r) => r.id === id);
export const getPlanEntry = (id: string) => state.plan.find((p) => p.id === id);
