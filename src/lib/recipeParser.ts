export type ParsedRecipe = {
  title: string;
  servings?: string;
  ingredients: string[];
  steps: string[];
  /** Total tid i minutter, hvis oppgitt. */
  minutes?: number;
  tags?: string[];
  /** `structured` = fra sidens oppskriftsdata; `text` = gjettet ut fra sidens tekst og bør sjekkes. */
  quality?: 'structured' | 'text';
  /** Alle bilde-kandidater fra oppskriftsdata, største først når størrelse er oppgitt. */
  imageUrls: string[];
};

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  oslash: 'ø',
  Oslash: 'Ø',
  aring: 'å',
  Aring: 'Å',
  aelig: 'æ',
  AElig: 'Æ',
};

export function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&([a-z]+);/gi, (m, n: string) => ENTITIES[n] ?? ENTITIES[n.toLowerCase()] ?? m);
}

function clean(s: unknown): string {
  if (typeof s !== 'string') return '';
  return decodeEntities(s.replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

function asArray<T>(v: T | T[] | undefined | null): T[] {
  if (v === undefined || v === null) return [];
  return Array.isArray(v) ? v : [v];
}

function isRecipeNode(n: unknown): n is Record<string, unknown> {
  if (!n || typeof n !== 'object') return false;
  const t = (n as Record<string, unknown>)['@type'];
  return asArray(t as string | string[]).some((x) => x === 'Recipe');
}

function findRecipe(node: unknown): Record<string, unknown> | null {
  if (Array.isArray(node)) {
    for (const n of node) {
      const r = findRecipe(n);
      if (r) return r;
    }
    return null;
  }
  if (isRecipeNode(node)) return node;
  if (node && typeof node === 'object') {
    const graph = (node as Record<string, unknown>)['@graph'];
    if (graph) return findRecipe(graph);
  }
  return null;
}

function parseSteps(instructions: unknown): string[] {
  if (typeof instructions === 'string') {
    return instructions
      .replace(/<\/(p|li|div)>|<br\s*\/?>/gi, '\n')
      .split('\n')
      .map(clean)
      .filter(Boolean);
  }
  const out: string[] = [];
  for (const item of asArray(instructions as unknown[])) {
    if (typeof item === 'string') {
      const c = clean(item);
      if (c) out.push(c);
    } else if (item && typeof item === 'object') {
      const o = item as Record<string, unknown>;
      if (o.itemListElement) out.push(...parseSteps(o.itemListElement));
      else {
        const c = clean(o.text ?? o.name);
        if (c) out.push(c);
      }
    }
  }
  return out;
}

type ImageCandidate = { url: string; area: number };

function collectImages(img: unknown, out: ImageCandidate[]): void {
  if (typeof img === 'string') {
    if (img.trim()) out.push({ url: img.trim(), area: 0 });
  } else if (Array.isArray(img)) {
    for (const x of img) collectImages(x, out);
  } else if (img && typeof img === 'object') {
    const o = img as Record<string, unknown>;
    const before = out.length;
    collectImages(o.url ?? o.contentUrl, out);
    const w = Number(o.width);
    const h = Number(o.height);
    if (out.length > before && w > 0 && h > 0) out[out.length - 1].area = w * h;
  }
}

function parseImages(img: unknown): string[] {
  const found: ImageCandidate[] = [];
  collectImages(img, found);
  // Stabil sortering: størst oppgitt areal først, ellers original rekkefølge.
  return found
    .map((c, i) => ({ ...c, i }))
    .sort((a, b) => b.area - a.area || a.i - b.i)
    .map((c) => c.url);
}

const JUNK_IMAGE = /(logo|icon|favicon|sprite|avatar|placeholder|blank|pixel|badge|banner-ad)/i;

/** Gjør URL-er absolutte, fjerner duplikater, ikoner/logoer og ikke-bildeformater. */
export function cleanImageCandidates(urls: string[], baseUrl: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const u of urls) {
    let abs: URL;
    try {
      abs = new URL(decodeEntities(u), baseUrl);
    } catch {
      continue;
    }
    if (abs.protocol !== 'http:' && abs.protocol !== 'https:') continue;
    if (/\.(svg|ico|gif)(\?|$)/i.test(abs.pathname) || JUNK_IMAGE.test(abs.pathname)) continue;
    const href = abs.toString();
    if (!seen.has(href)) {
      seen.add(href);
      out.push(href);
    }
  }
  return out;
}

/** Bilder som siden selv peker ut som hovedbilde (Open Graph / Twitter / image_src). */
export function extractMetaImages(html: string): string[] {
  const out: string[] = [];
  const tags = html.match(/<(meta|link)\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const attr = (name: string) =>
      new RegExp(`${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'i').exec(tag);
    const key = (attr('property') ?? attr('name') ?? attr('rel'))
      ?.slice(1)
      .find(Boolean)
      ?.toLowerCase();
    if (!key) continue;
    if (
      [
        'og:image',
        'og:image:url',
        'og:image:secure_url',
        'twitter:image',
        'twitter:image:src',
        'image_src',
      ].includes(key)
    ) {
      const val = (attr('content') ?? attr('href'))?.slice(1).find(Boolean);
      if (val) out.push(val);
    }
  }
  return out;
}

/** ISO 8601-varighet («PT1H30M», «P0DT45M») til minutter. */
export function parseDuration(iso: unknown): number | undefined {
  if (typeof iso !== 'string') return undefined;
  const m =
    /^P(?:(\d+)D)?(?:T(?:(\d+(?:[.,]\d+)?)H)?(?:(\d+(?:[.,]\d+)?)M)?(?:(\d+(?:[.,]\d+)?)S)?)?$/i.exec(
      iso.trim(),
    );
  if (!m) return undefined;
  const n = (x?: string) => (x ? parseFloat(x.replace(',', '.')) : 0);
  const minutes = Math.round(n(m[1]) * 1440 + n(m[2]) * 60 + n(m[3]) + n(m[4]) / 60);
  return minutes > 0 ? minutes : undefined;
}

function parseTagsFrom(r: Record<string, unknown>): string[] {
  const raw: string[] = [];
  for (const key of ['recipeCategory', 'recipeCuisine', 'keywords']) {
    const v = r[key];
    if (typeof v === 'string') raw.push(...v.split(','));
    else if (Array.isArray(v)) raw.push(...v.filter((x): x is string => typeof x === 'string'));
  }
  return [
    ...new Set(
      raw.map((t) => clean(t).toLowerCase()).filter((t) => t.length > 1 && t.length <= 30),
    ),
  ].slice(0, 6);
}

function sumTimes(r: Record<string, unknown>): number | undefined {
  const a = parseDuration(r.prepTime) ?? 0;
  const b = parseDuration(r.cookTime) ?? 0;
  return a + b > 0 ? a + b : undefined;
}

/** Henter oppskrift fra schema.org/Recipe JSON-LD i en HTML-side. */
export function parseRecipeFromHtml(html: string): ParsedRecipe | null {
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    let data: unknown;
    try {
      data = JSON.parse(m[1].trim());
    } catch {
      continue;
    }
    const r = findRecipe(data);
    if (!r) continue;
    const title = clean(r.name);
    const ingredients = asArray(r.recipeIngredient as string[])
      .map(clean)
      .filter(Boolean);
    const steps = parseSteps(r.recipeInstructions);
    if (!title || (ingredients.length === 0 && steps.length === 0)) continue;
    const y = Array.isArray(r.recipeYield) ? r.recipeYield[0] : r.recipeYield;
    return {
      title,
      ingredients,
      steps,
      servings: y !== undefined ? clean(String(y)) || undefined : undefined,
      imageUrls: parseImages(r.image),
      minutes: parseDuration(r.totalTime) ?? sumTimes(r),
      tags: parseTagsFrom(r),
      quality: 'structured',
    };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Reserve 1: eldre «microdata» (itemprop) uten JSON-LD
// ---------------------------------------------------------------------------

const VOID_TAGS = new Set(['meta', 'link', 'img', 'input', 'br']);

/** `raw` beholder innholdets HTML (nødvendig for å skille avsnitt i fremgangsmåten). */
function itempropValues(html: string, prop: string, raw = false): string[] {
  const out: string[] = [];
  const open = new RegExp(`<([a-z0-9]+)\\b([^>]*\\bitemprop=["']${prop}["'][^>]*)>`, 'gi');
  for (const m of html.matchAll(open)) {
    const tag = m[1].toLowerCase();
    const attrs = m[2];
    const attr = /\b(?:content|datetime|src)=["']([^"']*)["']/i.exec(attrs)?.[1];
    let text = attr;
    if (text === undefined && !VOID_TAGS.has(tag) && !attrs.endsWith('/')) {
      const start = m.index! + m[0].length;
      const end = html.toLowerCase().indexOf(`</${tag}>`, start);
      if (end > start) text = raw ? html.slice(start, end) : clean(html.slice(start, end));
    }
    if (text) out.push(text);
  }
  return out;
}

export function parseRecipeFromMicrodata(html: string): ParsedRecipe | null {
  if (!/itemtype=["'][^"']*schema\.org\/Recipe["']/i.test(html)) return null;
  const title = itempropValues(html, 'name')[0];
  const ingredients = [
    ...itempropValues(html, 'recipeIngredient'),
    ...itempropValues(html, 'ingredients'),
  ]
    .map(clean)
    .filter(Boolean);
  const steps = itempropValues(html, 'recipeInstructions', true).flatMap((t) => parseSteps(t));
  if (!title || (ingredients.length === 0 && steps.length === 0)) return null;
  const img = itempropValues(html, 'image')[0];
  return {
    title,
    ingredients,
    steps,
    servings: itempropValues(html, 'recipeYield')[0],
    minutes: parseDuration(itempropValues(html, 'totalTime')[0]),
    imageUrls: img ? [img] : [],
    quality: 'structured',
  };
}

// ---------------------------------------------------------------------------
// Reserve 2: les sidens tekst og se etter «Ingredienser» og «Fremgangsmåte»
// ---------------------------------------------------------------------------

export function htmlToLines(html: string): string[] {
  const cleaned = html
    .replace(
      /<(script|style|noscript|svg|nav|header|footer|form|iframe|button)\b[\s\S]*?<\/\1>/gi,
      ' ',
    )
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(
      /<\/?(p|div|li|ul|ol|br|h[1-6]|section|article|tr|td|th|table|dt|dd|span\s+class="[^"]*step[^"]*")\b[^>]*>/gi,
      '\n',
    );
  return decodeEntities(cleaned.replace(/<[^>]*>/g, ' '))
    .split('\n')
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

const ING_HEAD = /^ingredienser\b/i;
const STEP_HEAD =
  /^(fremgangsmåte|framgangsmåte|slik gjør du( det)?|tilberedning|instructions|directions|method)\b/i;
const END_NOISE =
  /^(kommentar|relaterte|del denne|del oppskriften|abonner|skriv ut|print|tips og triks|lignende|flere oppskrifter|oppskrift fra)/i;

/** Siste utvei når siden ikke har oppskriftsdata. Krever både ingredienser og fremgangsmåte, og må sjekkes av brukeren. */
export function parseRecipeFromText(html: string): ParsedRecipe | null {
  const lines = htmlToLines(html);
  const ingAt = lines.findIndex((l) => ING_HEAD.test(l) && l.length <= 40);
  if (ingAt < 0) return null;
  const stepAt = lines.findIndex((l, i) => i > ingAt && STEP_HEAD.test(l) && l.length <= 40);
  if (stepAt < 0) return null;

  const ingredients = lines.slice(ingAt + 1, stepAt).filter((l) => l.length <= 120);
  const rest = lines.slice(stepAt + 1);
  const endAt = rest.findIndex((l) => END_NOISE.test(l));
  const steps = (endAt >= 0 ? rest.slice(0, endAt) : rest).filter((l) => l.length > 3).slice(0, 40);
  if (ingredients.length < 2 || steps.length < 1) return null;

  const h1 = /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html)?.[1];
  const og = /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']*)["']/i.exec(html)?.[1];
  const title = clean(h1 ?? og ?? '') || lines[Math.max(0, ingAt - 1)];
  if (!title) return null;
  return { title, ingredients, steps, imageUrls: [], quality: 'text' };
}

/** Prøver oppskriftsdata først, så eldre markup, og til slutt sidens tekst. */
export function parseRecipeFromPage(html: string): ParsedRecipe | null {
  return parseRecipeFromHtml(html) ?? parseRecipeFromMicrodata(html) ?? parseRecipeFromText(html);
}
