/** Rene hjelpere for strekkoder (ingen nettverk eller lagring). */

/** Fjerner alt som ikke er siffer. */
export const digitsOnly = (code: string) => code.replace(/\D/g, '');

/** Sjekksiffer for GTIN-8/12/13/14 (alle bruker samme algoritme). */
export function isValidGtin(code: string): boolean {
  const d = digitsOnly(code);
  if (![8, 12, 13, 14].includes(d.length)) return false;
  const nums = d.split('').map(Number);
  const check = nums.pop()!;
  const sum = nums.reverse().reduce((acc, n, i) => acc + n * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === check;
}

/** Gjør EAN/UPC sammenlignbare: UPC-A (12) og EAN-14 med innledende 0 blir EAN-13. */
export function normalizeGtin(code: string): string {
  const d = digitsOnly(code);
  if (d.length === 12) return `0${d}`;
  if (d.length === 14 && d.startsWith('0')) return d.slice(1);
  return d;
}

export type BarcodeProduct = { name: string; brand?: string; quantity?: string };

type OffResponse = {
  status?: number;
  product?: {
    product_name?: string;
    product_name_no?: string;
    product_name_nb?: string;
    generic_name?: string;
    brands?: string;
    quantity?: string;
  };
};

const clean = (s?: string) => (s ?? '').replace(/\s+/g, ' ').trim();

/** Leser svaret fra Open Food Facts. Foretrekker norsk navn. Gir null hvis varen ikke finnes eller mangler navn. */
export function parseOffProduct(json: unknown): BarcodeProduct | null {
  const r = json as OffResponse;
  if (!r || r.status !== 1 || !r.product) return null;
  const p = r.product;
  const name =
    clean(p.product_name_no) ||
    clean(p.product_name_nb) ||
    clean(p.product_name) ||
    clean(p.generic_name);
  if (!name) return null;
  const brand = clean(p.brands).split(',')[0]?.trim() || undefined;
  return { name, brand, quantity: clean(p.quantity) || undefined };
}

/** Navnet slik det foreslås lagt på lager: uten merkenavn hvis det står først, ellers uendret. */
export function suggestedName(p: BarcodeProduct): string {
  if (p.brand && p.name.toLowerCase().startsWith(p.brand.toLowerCase())) {
    const rest = p.name.slice(p.brand.length).trim();
    if (rest.length >= 2) return rest.charAt(0).toUpperCase() + rest.slice(1);
  }
  return p.name;
}
