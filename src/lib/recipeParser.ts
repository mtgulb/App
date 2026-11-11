export type ParsedRecipe = {
  title: string;
  servings?: string;
  ingredients: string[];
  steps: string[];
  imageUrl?: string;
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

function parseImage(img: unknown): string | undefined {
  if (typeof img === 'string') return img;
  if (Array.isArray(img)) return parseImage(img[0]);
  if (img && typeof img === 'object') return parseImage((img as Record<string, unknown>).url);
  return undefined;
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
      imageUrl: parseImage(r.image),
    };
  }
  return null;
}
