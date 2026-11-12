/**
 * «Hva kan jeg lage?»-økt. Det brukeren skriver inn her er midlertidig:
 * det holdes bare i minnet, skrives aldri til lageret, og forsvinner når økten avsluttes
 * eller appen lukkes. Lageret (permanente varer) er helt adskilt.
 */
import { useSyncExternalStore } from 'react';
import { expiringSoon } from './inventory.ts';
import type { FridgeState } from './types.ts';

export type SessionItem = { id: string; name: string };
export type SessionState = {
  items: SessionItem[];
  /** Ta med varene fra lageret i forslagene. */
  useStock: boolean;
  /** Lager som er valgt bort for denne økten. */
  excluded: string[];
};

const initial = (): SessionState => ({ items: [], useStock: true, excluded: [] });
let state: SessionState = initial();
const listeners = new Set<() => void>();

function set(next: SessionState) {
  state = next;
  listeners.forEach((l) => l());
}

export const getSession = () => state;

export function useSession(): SessionState {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
  );
}

let counter = 0;

/** Legger til midlertidige varer. Kommaseparert tekst gir flere; dubletter hoppes over. */
export function addSessionItems(text: string) {
  const names = text
    .split(/[,\n]/)
    .map((n) => n.trim())
    .filter(Boolean);
  const have = new Set(state.items.map((i) => i.name.toLowerCase()));
  const added: SessionItem[] = [];
  for (const name of names) {
    if (have.has(name.toLowerCase())) continue;
    have.add(name.toLowerCase());
    added.push({ id: `s${Date.now().toString(36)}${(counter++).toString(36)}`, name });
  }
  if (added.length) set({ ...state, items: [...state.items, ...added] });
}

export function removeSessionItem(id: string) {
  set({ ...state, items: state.items.filter((i) => i.id !== id) });
}

export function setUseStock(useStock: boolean) {
  set({ ...state, useStock });
}

export function toggleStorageIncluded(id: string) {
  set({
    ...state,
    excluded: state.excluded.includes(id)
      ? state.excluded.filter((x) => x !== id)
      : [...state.excluded, id],
  });
}

/** Avslutter økten: alle midlertidige varer og valg nullstilles. Lageret berøres ikke. */
export function endSession() {
  set(initial());
}

/**
 * Hva skal forslagene baseres på? Lageret (hvis valgt, og uten bortvalgte lager) pluss midlertidige varer.
 * `soon` er kun varer fra lageret som snart går ut.
 */
export function suggestionBasis(
  fridge: Pick<FridgeState, 'items'>,
  session: SessionState,
  now: Date = new Date(),
): { names: string[]; soon: string[] } {
  const stock = session.useStock
    ? fridge.items.filter((i) => !session.excluded.includes(i.place ?? ''))
    : [];
  const seen = new Set<string>();
  const names: string[] = [];
  for (const n of [...stock.map((i) => i.name), ...session.items.map((i) => i.name)]) {
    if (!seen.has(n.toLowerCase())) {
      seen.add(n.toLowerCase());
      names.push(n);
    }
  }
  return { names, soon: expiringSoon(stock, now).map((i) => i.name) };
}
