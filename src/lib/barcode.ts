/**
 * Oppslag av strekkoder: først det brukeren selv har lært appen, deretter Open Food Facts (åpen database,
 * ingen nøkkel). Finnes ikke varen, skriver brukeren navnet, og appen husker det til neste gang.
 * Hvor godt norske varer dekkes er ikke kjent på forhånd, så vi teller treff og bom (se `getBarcodeStats`).
 */
import Storage from 'expo-sqlite/kv-store';
import { normalizeGtin, parseOffProduct, type BarcodeProduct } from './barcodeParse';
import { t } from '../i18n/index.ts';

export type LookupResult =
  | { status: 'learned'; product: BarcodeProduct; productText?: string }
  | { status: 'found'; product: BarcodeProduct }
  | { status: 'notFound' }
  | { status: 'error'; message: string };

const LEARNED_KEY = 'barcodes_learned';
const STATS_KEY = 'barcode_stats';

type Learned = Record<string, BarcodeProduct & { productText?: string }>;
export type BarcodeStats = { scans: number; found: number; learned: number; notFound: number };

function read<T>(key: string, fallback: T): T {
  try {
    const raw = Storage.getItemSync(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export const getBarcodeStats = (): BarcodeStats =>
  read<BarcodeStats>(STATS_KEY, { scans: 0, found: 0, learned: 0, notFound: 0 });

function count(kind: 'found' | 'learned' | 'notFound') {
  const s = getBarcodeStats();
  Storage.setItemSync(STATS_KEY, JSON.stringify({ ...s, scans: s.scans + 1, [kind]: s[kind] + 1 }));
}

/**
 * Lærer appen hva en strekkode er: råvaren brukeren valgte (`name`), og produktteksten for visning.
 * Neste skanning av samme vare går da rett gjennom.
 */
export function rememberBarcode(code: string, product: BarcodeProduct & { productText?: string }) {
  const learned = read<Learned>(LEARNED_KEY, {});
  learned[normalizeGtin(code)] = product;
  Storage.setItemSync(LEARNED_KEY, JSON.stringify(learned));
}

const USER_AGENT = 'FamilieOppskrifter/1.0 (iOS; app@tande-gulbrandsen.no)';

export async function lookupBarcode(rawCode: string): Promise<LookupResult> {
  const code = normalizeGtin(rawCode);
  const learned = read<Learned>(LEARNED_KEY, {})[code];
  if (learned) {
    count('learned');
    return { status: 'learned', product: learned, productText: learned.productText };
  }
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=product_name,product_name_no,product_name_nb,generic_name,brands,quantity,categories_tags`,
      { headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' } },
    );
    if (res.status === 404) {
      count('notFound');
      return { status: 'notFound' };
    }
    if (!res.ok) return { status: 'error', message: t('lib.barcodeHttp', { status: res.status }) };
    const product = parseOffProduct(await res.json());
    if (!product) {
      count('notFound');
      return { status: 'notFound' };
    }
    count('found');
    return { status: 'found', product };
  } catch {
    return { status: 'error', message: t('lib.barcodeOffline') };
  }
}
