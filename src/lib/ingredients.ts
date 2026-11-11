import { normalizeTokens } from './synonyms.ts';
import type { Recipe } from './types';

export type ParsedIngredient = {
  qty: number | null;
  qtyMax: number | null;
  unit: string | null;
  /** Visningsnavn, f.eks. «kjøttdeig, hakket». */
  name: string;
  /** Normalisert nøkkel brukt til å slå sammen like varer. */
  key: string;
  raw: string;
  /** Mengden slik den sto i teksten, f.eks. «1 1/2» eller «2-3». Tom hvis ingen mengde. */
  qtyText: string;
};

const FRACTIONS: Record<string, number> = {
  '½': 0.5,
  '¼': 0.25,
  '¾': 0.75,
  '⅓': 1 / 3,
  '⅔': 2 / 3,
  '⅛': 0.125,
};
const FR = '[½¼¾⅓⅔⅛]';

const UNITS: Record<string, string> = {
  g: 'g',
  gram: 'g',
  hg: 'hg',
  kg: 'kg',
  ml: 'ml',
  cl: 'cl',
  dl: 'dl',
  l: 'l',
  liter: 'l',
  krm: 'krm',
  ts: 'ts',
  teskje: 'ts',
  teskjeer: 'ts',
  ss: 'ss',
  spiseskje: 'ss',
  spiseskjeer: 'ss',
  stk: 'stk',
  stykk: 'stk',
  pk: 'pk',
  pakke: 'pk',
  pakker: 'pk',
  boks: 'boks',
  bokser: 'boks',
  neve: 'neve',
  never: 'neve',
  klype: 'klype',
  fedd: 'fedd',
  skive: 'skive',
  skiver: 'skive',
  bunt: 'bunt',
  pose: 'pose',
  poser: 'pose',
};

const MASS: Record<string, number> = { g: 1, hg: 100, kg: 1000 };
const VOLUME: Record<string, number> = { ml: 1, cl: 10, dl: 100, l: 1000, krm: 1, ts: 5, ss: 15 };

function parseNumber(s: string): { value: number; rest: string } | null {
  let m = /^(\d+)\s+(\d+)\/(\d+)/.exec(s);
  if (m) return { value: +m[1] + +m[2] / +m[3], rest: s.slice(m[0].length) };
  m = /^(\d+)\/(\d+)/.exec(s);
  if (m) return { value: +m[1] / +m[2], rest: s.slice(m[0].length) };
  m = new RegExp(`^(\\d+(?:[.,]\\d+)?)\\s*(${FR})`).exec(s);
  if (m)
    return {
      value: parseFloat(m[1].replace(',', '.')) + FRACTIONS[m[2]],
      rest: s.slice(m[0].length),
    };
  m = new RegExp(`^(${FR})`).exec(s);
  if (m) return { value: FRACTIONS[m[1]], rest: s.slice(m[0].length) };
  m = /^(\d+(?:[.,]\d+)?)/.exec(s);
  if (m) return { value: parseFloat(m[1].replace(',', '.')), rest: s.slice(m[0].length) };
  return null;
}

function makeKey(name: string): string {
  const key = normalizeTokens(name).join(' ');
  return key || name.toLowerCase().split(',')[0].trim();
}

export function parseIngredient(line: string): ParsedIngredient {
  const raw = line.trim();
  const unparsed: ParsedIngredient = {
    qty: null,
    qtyMax: null,
    unit: null,
    name: raw,
    key: makeKey(raw),
    raw,
    qtyText: '',
  };
  let s = raw.replace(/^(ca\.?|circa)\s+/i, '');
  const start = s;
  const first = parseNumber(s);
  if (!first) return unparsed;
  let qty = first.value;
  let qtyMax: number | null = null;
  s = first.rest;
  const range = /^\s*[-–]\s*(?=\d|[½¼¾⅓⅔⅛])/.exec(s);
  if (range) {
    const second = parseNumber(s.slice(range[0].length));
    if (second) {
      qtyMax = second.value;
      s = second.rest;
    }
  }
  const qtyText = start.slice(0, start.length - s.length).trim();
  s = s.replace(/^\s+/, '');
  let unit: string | null = null;
  const tok = /^([A-Za-zæøåÆØÅ]+)\.?(?=\s|$)/.exec(s);
  if (tok && UNITS[tok[1].toLowerCase()]) {
    unit = UNITS[tok[1].toLowerCase()];
    s = s.slice(tok[0].length).replace(/^\s+/, '');
  }
  const name = s.replace(/^av\s+/i, '').trim();
  if (!name) return unparsed;
  if (qtyMax !== null && qtyMax < qty) [qty, qtyMax] = [qtyMax, qty];
  return { qty, qtyMax, unit, name, key: makeKey(name), raw, qtyText };
}

/** Ett desimal med komma, uten overflødig «,0». */
const decimal = (n: number) => String(Math.round(n * 10) / 10).replace('.', ',');

const QUARTERS: Record<number, string> = { 0: '', 1: '¼', 2: '½', 3: '¾' };

export function formatQty(n: number, unit: string | null = null): string {
  if (n >= 100) return String(Math.round(n));
  if (unit === 'g' || unit === 'ml' || unit === 'cl') {
    return n >= 1 ? String(Math.round(n)) : String(Math.round(n * 10) / 10).replace('.', ',');
  }
  if (n >= 10) return String(Math.round(n * 2) / 2).replace('.', ',');
  const q = Math.max(1, Math.round(n * 4));
  const whole = Math.floor(q / 4);
  const frac = QUARTERS[q % 4];
  return `${whole > 0 ? whole : ''}${frac}` || '0';
}

function qtyText(p: { qty: number; qtyMax: number | null; unit: string | null }, f = 1): string {
  const a = formatQty(p.qty * f, p.unit);
  const b = p.qtyMax !== null ? `–${formatQty(p.qtyMax * f, p.unit)}` : '';
  return `${a}${b}${p.unit ? ` ${p.unit}` : ''}`;
}

/** Ingrediens som tekst, skalert med faktor. Linjer uten mengde endres ikke. */
export function formatIngredient(p: ParsedIngredient, factor = 1): string {
  if (p.qty === null) return p.raw;
  return `${qtyText({ qty: p.qty, qtyMax: p.qtyMax, unit: p.unit }, factor)} ${p.name}`;
}

/** Grunnlag for porsjoner: første tall i oppskriftens porsjonstekst, ellers 4. */
export function baseServings(recipe: Pick<Recipe, 'servings'>): number {
  const m = recipe.servings ? /\d+/.exec(recipe.servings) : null;
  const n = m ? parseInt(m[0], 10) : 0;
  return n > 0 ? n : 4;
}

export const hasKnownServings = (recipe: Pick<Recipe, 'servings'>) =>
  !!recipe.servings && /\d+/.test(recipe.servings);

export function scaledLines(recipe: Recipe, servings: number): string[] {
  const f = servings / baseServings(recipe);
  return recipe.ingredients.map((l) => formatIngredient(parseIngredient(l), f));
}

export type MergedItem = { key: string; text: string };

type Bucket = {
  dim: 'mass' | 'volume' | 'count';
  unit: string | null;
  total: number;
  units: Set<string>;
};

function bucketOf(unit: string | null): { id: string; dim: Bucket['dim'] } {
  if (unit && MASS[unit]) return { id: 'mass', dim: 'mass' };
  if (unit && VOLUME[unit]) return { id: 'volume', dim: 'volume' };
  return { id: `count:${unit ?? ''}`, dim: 'count' };
}

/** Slår sammen like varer og summerer mengder (g/kg, ml/cl/dl/l/ss/ts regnes om). */
export function mergeIngredients(
  items: { parsed: ParsedIngredient; factor: number }[],
): MergedItem[] {
  const groups = new Map<string, { name: string; buckets: Map<string, Bucket>; noQty: boolean }>();
  for (const { parsed: p, factor } of items) {
    const g = groups.get(p.key) ?? {
      name:
        p.name
          .split(',')[0]
          .replace(/\(.*?\)/g, '')
          .trim() || p.name,
      buckets: new Map<string, Bucket>(),
      noQty: false,
    };
    groups.set(p.key, g);
    if (p.qty === null) {
      g.noQty = true;
      continue;
    }
    const { id, dim } = bucketOf(p.unit);
    const b = g.buckets.get(id) ?? { dim, unit: p.unit, total: 0, units: new Set<string>() };
    const amount = (p.qtyMax ?? p.qty) * factor;
    b.total +=
      dim === 'mass'
        ? amount * MASS[p.unit!]
        : dim === 'volume'
          ? amount * VOLUME[p.unit!]
          : amount;
    if (p.unit) b.units.add(p.unit);
    g.buckets.set(id, b);
  }

  const out: MergedItem[] = [];
  for (const [key, g] of groups) {
    const amounts: string[] = [];
    for (const b of g.buckets.values()) {
      if (b.dim === 'mass') {
        amounts.push(
          b.total >= 1000 ? `${decimal(b.total / 1000)} kg` : `${formatQty(b.total, 'g')} g`,
        );
      } else if (b.dim === 'volume') {
        if (b.units.size === 1) {
          const u = [...b.units][0];
          amounts.push(`${formatQty(b.total / VOLUME[u], u)} ${u}`);
        } else if (b.total >= 1000) amounts.push(`${decimal(b.total / 1000)} l`);
        else if (b.total >= 100) amounts.push(`${decimal(b.total / 100)} dl`);
        else amounts.push(`${formatQty(b.total, 'ml')} ml`);
      } else {
        amounts.push(`${formatQty(b.total, b.unit)}${b.unit ? ` ${b.unit}` : ''}`);
      }
    }
    const text =
      amounts.length === 0
        ? g.name
        : amounts.length === 1
          ? `${amounts[0]} ${g.name}`
          : `${g.name} (${amounts.join(' + ')})`;
    out.push({ key, text });
  }
  return out.sort((a, b) => a.key.localeCompare(b.key, 'nb'));
}

/** Enheter som kan velges i ingrediensredigering. */
export const UNIT_OPTIONS = [
  'g',
  'kg',
  'dl',
  'l',
  'ml',
  'cl',
  'ss',
  'ts',
  'krm',
  'stk',
  'pk',
  'boks',
  'fedd',
  'neve',
  'klype',
  'skive',
  'bunt',
  'pose',
] as const;

export type IngredientRow = { id: string; qty: string; unit: string; name: string };

let rowCounter = 0;
export const newRowId = () => `r${Date.now().toString(36)}${(rowCounter++).toString(36)}`;

/** Deler en ingrediensline i mengde, enhet og navn for redigering. */
export function rowFromLine(line: string): IngredientRow {
  const p = parseIngredient(line);
  if (p.qty === null) return { id: newRowId(), qty: '', unit: '', name: p.raw };
  return { id: newRowId(), qty: p.qtyText, unit: p.unit ?? '', name: p.name };
}

/** Setter en rad sammen til en ingrediensline. Tom streng hvis raden mangler navn. */
export function lineFromRow(row: IngredientRow): string {
  const name = row.name.trim();
  if (!name) return '';
  return [row.qty.trim(), row.unit, name].filter(Boolean).join(' ');
}
