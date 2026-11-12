/**
 * Sikkerhetskopi: hele innholdet som én tekst (JSON) som kan lagres i Notater, Filer eller e-post,
 * og limes inn igjen for å gjenopprette. Ren logikk, testet uten telefon.
 * Bilder som ligger lokalt på telefonen tas ikke med (bare nettadresser), og kalenderkoblinger
 * fjernes fordi de bare gjelder den telefonen.
 */
import type { State } from './store.ts';
import type { MealPlanEntry, Recipe } from './types.ts';

export const BACKUP_APP = 'panful';
export const BACKUP_VERSION = 1;

export type Backup = { app: typeof BACKUP_APP; version: number; createdAt: string; data: State };
export type BackupSummary = { recipes: number; plan: number; stock: number; shoppingItems: number };

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const isStrArr = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((x) => typeof x === 'string');
const isRemote = (u: string) => /^https?:\/\//i.test(u);

export function createBackup(state: State, now: Date = new Date()): string {
  const data: State = {
    ...state,
    recipes: state.recipes.map((r) => ({ ...r, images: r.images.filter(isRemote) })),
    plan: state.plan.map(({ calendarEventId: _c, ...p }) => p),
  };
  const backup: Backup = {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    createdAt: now.toISOString(),
    data,
  };
  return JSON.stringify(backup);
}

export type ParseResult =
  | { ok: true; state: State; createdAt: string; summary: BackupSummary }
  | { ok: false; reason: 'notBackup' | 'tooNew' | 'corrupt' };

function validRecipe(r: unknown): r is Recipe {
  return (
    isObj(r) &&
    typeof r.id === 'string' &&
    typeof r.title === 'string' &&
    isStrArr(r.ingredients) &&
    isStrArr(r.steps) &&
    isStrArr(r.images) &&
    typeof r.createdAt === 'number'
  );
}

function validPlan(p: unknown): p is MealPlanEntry {
  return (
    isObj(p) &&
    typeof p.id === 'string' &&
    typeof p.recipeId === 'string' &&
    typeof p.date === 'string' &&
    !Number.isNaN(Date.parse(p.date))
  );
}

/** Leser en sikkerhetskopi. Gjør ingenting med dataene; kalleren bestemmer om de skal brukes. */
export function parseBackup(text: string, defaults: State): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text.trim());
  } catch {
    return { ok: false, reason: 'notBackup' };
  }
  if (!isObj(raw) || raw.app !== BACKUP_APP || !isObj(raw.data)) {
    return { ok: false, reason: 'notBackup' };
  }
  if (typeof raw.version !== 'number' || raw.version > BACKUP_VERSION) {
    return { ok: false, reason: 'tooNew' };
  }
  const d = raw.data;
  if (!Array.isArray(d.recipes) || !d.recipes.every(validRecipe)) {
    return { ok: false, reason: 'corrupt' };
  }
  if (!Array.isArray(d.plan) || !d.plan.every(validPlan)) return { ok: false, reason: 'corrupt' };
  const ids = new Set(d.recipes.map((r) => r.id));
  const sh = isObj(d.shopping) ? d.shopping : {};
  const fr = isObj(d.fridge) ? d.fridge : {};
  const state: State = {
    recipes: d.recipes,
    // Dinnerplan for oppskrifter som ikke finnes, hoppes over.
    plan: d.plan.filter((p) => ids.has(p.recipeId)).map(({ calendarEventId: _c, ...p }) => p),
    shopping: {
      ...defaults.shopping,
      ...(sh as object),
      fromRecipes: (Array.isArray(sh.fromRecipes) ? sh.fromRecipes : []).filter(
        (x: unknown) => isObj(x) && typeof x.recipeId === 'string' && ids.has(x.recipeId),
      ) as State['shopping']['fromRecipes'],
    },
    fridge: { ...defaults.fridge, ...(fr as object) } as State['fridge'],
    settings: { ...defaults.settings, ...(isObj(d.settings) ? d.settings : {}) },
  };
  return {
    ok: true,
    state,
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : '',
    summary: {
      recipes: state.recipes.length,
      plan: state.plan.length,
      stock: state.fridge.items.length,
      shoppingItems: state.shopping.fromRecipes.length + state.shopping.extras.length,
    },
  };
}

/** Beholder bilder som allerede ligger lokalt på telefonen for oppskrifter med samme id. */
export function keepLocalImages(next: State, current: State): State {
  const local = new Map(
    current.recipes.map((r) => [r.id, r.images.filter((u) => !isRemote(u))] as const),
  );
  return {
    ...next,
    recipes: next.recipes.map((r) => {
      const l = local.get(r.id) ?? [];
      return l.length
        ? { ...r, images: [...r.images, ...l.filter((u) => !r.images.includes(u))] }
        : r;
    }),
  };
}
