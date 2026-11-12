/**
 * Fra produktnavn til råvare: «Green Giant Sweet Corn 200 g» → «mais».
 * Produktnavn på strekkoder er fulle av merke, mengde og markedsføringsord og stemmer sjelden med
 * ordene i oppskrifter. Her renser vi navnet og slår opp resten i synonymlisten (norsk og engelsk).
 */
import { KNOWN_INGREDIENTS, knownIngredient, normalizeTokens } from './synonyms.ts';

/** Ord på pakker som ikke sier noe om hva varen er. */
const NOISE = new Set([
  'økologisk',
  'økologiske',
  'organic',
  'bio',
  'original',
  'classic',
  'klassisk',
  'extra',
  'ekstra',
  'premium',
  'deluxe',
  'naturell',
  'natural',
  'lett',
  'light',
  'mini',
  'maxi',
  'stor',
  'liten',
  'family',
  'familie',
  'pack',
  'pakke',
  'pose',
  'boks',
  'glass',
  'flaske',
  'tube',
  'brett',
  'pk',
  'stk',
  'ca',
  'norsk',
  'norske',
  'fersk',
  'ferske',
  'the',
  'and',
  'with',
  'in',
  'av',
  'og',
  'med',
  'til',
  'i',
  'for',
  'no',
  'naturlig',
  'sweet',
  'tasty',
  'smak',
  'taste',
]);

/** Fjerner mengder («200 g», «1,5 l», «6 pk», «12%») og løse tall. */
export function stripQuantities(s: string): string {
  return s
    .replace(/\b\d+(?:[.,]\d+)?\s*(?:g|gr|kg|ml|cl|dl|l|liter|stk|pk|x)\b/gi, ' ')
    .replace(/\b\d+(?:[.,]\d+)?\s*%/g, ' ')
    .replace(/\b\d+(?:[.,]\d+)?\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Kategorier fra Open Food Facts til råvare. Brukes som støtte når navnet ikke avslører det. */
const CATEGORY_TO_INGREDIENT: Record<string, string> = {
  'en:sweet-corn': 'mais',
  'en:corn': 'mais',
  'en:milks': 'melk',
  'en:semi-skimmed-milks': 'melk',
  'en:whole-milks': 'melk',
  'en:eggs': 'egg',
  'en:butters': 'smør',
  'en:cheeses': 'ost',
  'en:pastas': 'pasta',
  'en:rices': 'ris',
  'en:wheat-flours': 'mel',
  'en:flours': 'mel',
  'en:sugars': 'sukker',
  'en:tomatoes': 'tomat',
  'en:canned-tomatoes': 'tomat',
  'en:chicken': 'kylling',
  'en:salmons': 'laks',
  'en:cods': 'torsk',
  'en:minced-meats': 'kjøttdeig',
  'en:potatoes': 'potet',
  'en:onions': 'løk',
  'en:carrots': 'gulrot',
  'en:olive-oils': 'olivenolje',
  'en:vegetable-oils': 'olje',
  'en:yogurts': 'yoghurt',
  'en:creams': 'fløte',
  'en:breads': 'brød',
  'en:kidney-beans': 'bønner',
  'en:beans': 'bønner',
  'en:chickpeas': 'kikerter',
  'en:lentils': 'linser',
  'en:tunas': 'tunfisk',
  'en:honeys': 'honning',
  'en:mustards': 'sennep',
  'en:ketchup': 'ketchup',
  'en:mayonnaises': 'majones',
  'en:coconut-milks': 'kokosmelk',
  'en:soy-sauces': 'soyasaus',
  'en:cucumbers': 'agurk',
  'en:peppers': 'paprika',
  'en:mushrooms': 'sopp',
  'en:spinaches': 'spinat',
  'en:broccoli': 'brokkoli',
};

export type IdentifiedProduct = {
  /** Beste gjetning på råvaren, eller null hvis vi ikke kjenner den. */
  ingredient: string | null;
  /** Alle kandidater, beste først. */
  candidates: string[];
  /** Produktnavnet uten merke og mengde, til visning. */
  cleaned: string;
};

/** Hoveddelen av et sammensatt ord: «melkesjokolade» → «sjokolade». Bare lange, kjente ord. */
function headOf(token: string): string | null {
  let best: string | null = null;
  for (const k of KNOWN_INGREDIENTS) {
    if (
      k.length >= 5 &&
      token.length > k.length &&
      token.endsWith(k) &&
      (!best || k.length > best.length)
    ) {
      best = k;
    }
  }
  return best;
}

export function identifyIngredient(input: {
  name: string;
  brand?: string;
  categories?: string[];
}): IdentifiedProduct {
  let text = input.name;
  // Merkenavnet fjernes (hvis resten ikke blir tom).
  if (input.brand) {
    const re = new RegExp(`\\b${input.brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'ig');
    const without = text.replace(re, ' ').trim();
    if (without.length >= 2) text = without;
  }
  const cleaned = stripQuantities(text);

  const candidates: string[] = [];
  const add = (c: string | null | undefined) => {
    if (c && !candidates.includes(c)) candidates.push(c);
  };

  for (const token of normalizeTokens(cleaned)) {
    if (NOISE.has(token)) continue;
    add(knownIngredient(token) ?? headOf(token));
  }
  for (const cat of input.categories ?? []) add(CATEGORY_TO_INGREDIENT[cat]);

  return { ingredient: candidates[0] ?? null, candidates, cleaned };
}

/** «mais» → «Mais» */
export const displayIngredient = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
