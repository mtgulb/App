export type ParsedRecipe = {
  title: string;
  servings?: string;
  ingredients: string[];
  steps: string[];
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
    };
  }
  return null;
}
