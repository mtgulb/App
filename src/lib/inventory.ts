import type { FridgeItem } from './types.ts';

export const PLACES = [
  { id: 'fridge', label: 'Kjøleskap' },
  { id: 'freezer', label: 'Fryser' },
  { id: 'pantry', label: 'Skap' },
] as const;
export type Place = (typeof PLACES)[number]['id'];

export const placeOf = (item: Pick<FridgeItem, 'place'>): Place => item.place ?? 'fridge';

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Antall hele dager til datoen (YYYY-MM-DD). Negativt = utløpt. */
export function daysUntil(date: string, now: Date = new Date()): number {
  const [y, m, d] = date.split('-').map(Number);
  const target = new Date(y, m - 1, d);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export type ExpiryState = 'expired' | 'soon' | 'ok';

/** Utløpsdato er valgfri: uten dato finnes ingen status. */
export function expiryState(
  item: Pick<FridgeItem, 'expires'>,
  now: Date = new Date(),
  soonDays = 3,
): ExpiryState | null {
  if (!item.expires) return null;
  const d = daysUntil(item.expires, now);
  return d < 0 ? 'expired' : d <= soonDays ? 'soon' : 'ok';
}

export const EXPIRY_PRESETS = [
  { label: '3 dager', days: 3 },
  { label: '1 uke', days: 7 },
  { label: '2 uker', days: 14 },
  { label: '1 måned', days: 30 },
  { label: '3 måneder', days: 90 },
] as const;

export function dateInDays(days: number, now: Date = new Date()): string {
  return ymd(new Date(now.getFullYear(), now.getMonth(), now.getDate() + days));
}

/** Varer som snart går ut (eller har gått ut), tidligst først. */
export function expiringSoon(
  items: FridgeItem[],
  now: Date = new Date(),
  soonDays = 3,
): FridgeItem[] {
  return items
    .filter((i) => i.expires && daysUntil(i.expires, now) <= soonDays)
    .sort((a, b) => a.expires!.localeCompare(b.expires!));
}

export function expiryLabel(date: string, now: Date = new Date()): string {
  const d = daysUntil(date, now);
  if (d < 0) return d === -1 ? 'Utløp i går' : `Utløpt for ${-d} dager siden`;
  if (d === 0) return 'Utløper i dag';
  if (d === 1) return 'Utløper i morgen';
  return `Utløper om ${d} dager`;
}
