import type { FridgeItem, FridgeState, StorageDef } from './types.ts';
import { t } from '../i18n/index.ts';

/** Ids til lagrene som er frysere (brukes av påminnelser). */
export const freezerIds = (storages: { id: string; freezer?: boolean }[]) =>
  storages.filter((x) => x.freezer).map((x) => x.id);

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
  {
    get label() {
      return t('unit.preset3d');
    },
    days: 3,
  },
  {
    get label() {
      return t('unit.preset1w');
    },
    days: 7,
  },
  {
    get label() {
      return t('unit.preset2w');
    },
    days: 14,
  },
  {
    get label() {
      return t('unit.preset1m');
    },
    days: 30,
  },
  {
    get label() {
      return t('unit.preset3m');
    },
    days: 90,
  },
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
  if (d < 0) return d === -1 ? t('lib.expiredYesterday') : t('lib.expiredDaysAgo', { days: -d });
  if (d === 0) return t('lib.expiresToday');
  if (d === 1) return t('lib.expiresTomorrow');
  return t('lib.expiresInDays', { days: d });
}

const legacyStorages = (): StorageDef[] => [
  { id: 'fridge', name: t('lib.storageFridge') },
  { id: 'freezer', name: t('lib.storageFreezer'), freezer: true },
  { id: 'pantry', name: t('lib.storagePantry') },
];

/** Nye brukere starter med ett felles lager. Eldre data (kjøleskap/fryser/skap) flyttes over uten tap. */
export function migrateFridge(v: Partial<FridgeState>): FridgeState {
  const items = (v.items ?? []).map((i) => ({ ...i, place: i.place ?? 'fridge' }));
  let storages = v.storages;
  if (!storages || storages.length === 0) {
    const used = new Set(items.map((i) => i.place));
    storages =
      used.size === 0
        ? [{ id: 'main', name: t('lib.storageMain') }]
        : legacyStorages().filter((l) => used.has(l.id));
    if (storages.length === 0) storages = [{ id: 'main', name: t('lib.storageMain') }];
  }
  const first = storages[0].id;
  // Varer som peker på et lager som ikke finnes lenger, havner i det første.
  const known = new Set(storages.map((x) => x.id));
  return {
    items: items.map((i) => (known.has(i.place!) ? i : { ...i, place: first })),
    storages,
    assumeStaples: v.assumeStaples ?? true,
  };
}
