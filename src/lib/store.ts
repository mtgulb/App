import Storage from 'expo-sqlite/kv-store';
import { useSyncExternalStore } from 'react';
import type { MealPlanEntry, Recipe } from './types';

type State = { recipes: Recipe[]; plan: MealPlanEntry[] };

function load<T>(key: string): T[] {
  try {
    const raw = Storage.getItemSync(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

let state: State = { recipes: load<Recipe>('recipes'), plan: load<MealPlanEntry>('plan') };
const listeners = new Set<() => void>();

function commit(next: State) {
  if (next.recipes !== state.recipes) Storage.setItemSync('recipes', JSON.stringify(next.recipes));
  if (next.plan !== state.plan) Storage.setItemSync('plan', JSON.stringify(next.plan));
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

export function deleteRecipe(id: string) {
  commit({
    recipes: state.recipes.filter((r) => r.id !== id),
    plan: state.plan.filter((p) => p.recipeId !== id),
  });
}

export function addPlanEntry(e: Omit<MealPlanEntry, 'id'>): MealPlanEntry {
  const entry = { ...e, id: newId() };
  commit({ ...state, plan: [...state.plan, entry] });
  return entry;
}

export function removePlanEntry(id: string) {
  commit({ ...state, plan: state.plan.filter((p) => p.id !== id) });
}

export const getRecipe = (id: string) => state.recipes.find((r) => r.id === id);
export const getPlanEntry = (id: string) => state.plan.find((p) => p.id === id);
