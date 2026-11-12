import { normalizeTokens } from './synonyms.ts';

export const DEPARTMENTS = [
  'Frukt og grønt',
  'Kjøtt og fisk',
  'Meieri og egg',
  'Brød og bakevarer',
  'Tørrvarer og hermetikk',
  'Krydder og sauser',
  'Frys',
  'Drikke',
  'Annet',
] as const;
export type Department = (typeof DEPARTMENTS)[number];

const WORDS: Record<Exclude<Department, 'Frys' | 'Annet'>, string[]> = {
  'Frukt og grønt': [
    'løk',
    'hvitløk',
    'tomat',
    'potet',
    'gulrot',
    'agurk',
    'paprika',
    'sitron',
    'lime',
    'squash',
    'aubergine',
    'brokkoli',
    'blomkål',
    'spinat',
    'salat',
    'sopp',
    'purre',
    'selleri',
    'kål',
    'rødbeter',
    'søtpotet',
    'vårløk',
    'rødløk',
    'ingefær',
    'chili',
    'eple',
    'banan',
    'appelsin',
    'pære',
    'drue',
    'bær',
    'jordbær',
    'blåbær',
    'bringebær',
    'avokado',
    'mango',
    'persille',
    'basilikum',
    'koriander',
    'timian',
    'rosmarin',
    'dill',
    'gressløk',
    'mynte',
    'reddik',
    'asparges',
    'mais',
    'erter',
    'ruccola',
    'fennikel',
    'pastinakk',
    'kålrot',
    'neper',
  ],
  'Kjøtt og fisk': [
    'kylling',
    'kyllingfilet',
    'kjøttdeig',
    'svinekjøtt',
    'storfekjøtt',
    'laks',
    'torsk',
    'reker',
    'bacon',
    'skinke',
    'pølse',
    'lam',
    'kalkun',
    'biff',
    'kotelett',
    'sei',
    'hyse',
    'ørret',
    'makrell',
    'and',
    'svin',
    'okse',
    'kjøtt',
    'fisk',
    'filet',
    'karbonade',
    'ribbe',
    'spekeskinke',
    'kjøttkaker',
    'fiskekaker',
    'sild',
    'kveite',
    'steinbit',
    'blåskjell',
    'krabbe',
  ],
  'Meieri og egg': [
    'melk',
    'fløte',
    'smør',
    'ost',
    'egg',
    'yoghurt',
    'rømme',
    'cremefraiche',
    'feta',
    'mozzarella',
    'parmesan',
    'kesam',
    'margarin',
    'cottage',
    'kefir',
    'skyr',
    'brie',
    'brunost',
    'gouda',
  ],
  'Brød og bakevarer': [
    'brød',
    'tortilla',
    'mel',
    'sukker',
    'bakepulver',
    'natron',
    'gjær',
    'vaniljesukker',
    'havregryn',
    'maisenna',
    'kakao',
    'sjokolade',
    'farin',
    'melis',
    'rundstykke',
    'baguette',
    'pita',
    'lomper',
    'knekkebrød',
    'kjeks',
    'strø',
    'glasur',
  ],
  'Tørrvarer og hermetikk': [
    'ris',
    'pasta',
    'nudler',
    'linser',
    'kikerter',
    'bønner',
    'hermetikk',
    'tomatpuré',
    'kokosmelk',
    'buljong',
    'tunfisk',
    'olje',
    'olivenolje',
    'eddik',
    'honning',
    'sirup',
    'nøtter',
    'mandler',
    'couscous',
    'bulgur',
    'quinoa',
    'frø',
    'rosiner',
    'tørket',
    'spaghetti',
    'lasagneplater',
    'peanøtter',
    'cashewnøtter',
    'valnøtter',
    'kokos',
  ],
  'Krydder og sauser': [
    'salt',
    'pepper',
    'kanel',
    'spisskummen',
    'paprikapulver',
    'oregano',
    'karri',
    'kardemomme',
    'muskat',
    'soyasaus',
    'sennep',
    'ketchup',
    'majones',
    'tabasco',
    'saus',
    'krydder',
    'gurkemeie',
    'koriander',
    'nellik',
    'safran',
    'wasabi',
    'sriracha',
    'pesto',
    'dressing',
    'harissa',
  ],
  Drikke: ['vin', 'øl', 'juice', 'kaffe', 'te', 'brus', 'cider', 'mineralvann'],
};

/** Rekkefølgen bestemmer hvem som vinner ved treff i flere avdelinger (krydder foran grønnsaker for «koriander» osv. håndteres via eksakt treff først). */
const ORDER = Object.keys(WORDS) as (keyof typeof WORDS)[];

const hit = (token: string, word: string) =>
  token === word || (word.length >= 4 && (token.endsWith(word) || token.startsWith(word)));

/** Hvilken avdeling i butikken hører varen til? */
export function departmentOf(name: string): Department {
  if (/frossen|frosne|frozen|fryse/i.test(name)) return 'Frys';
  const tokens = normalizeTokens(name);
  // Eksakt treff på et ord veier tyngre enn delvis treff (sammensatte ord).
  for (const token of tokens) {
    for (const dep of ORDER) if (WORDS[dep].includes(token)) return dep;
  }
  for (const token of tokens) {
    for (const dep of ORDER) if (WORDS[dep].some((w) => hit(token, w))) return dep;
  }
  return 'Annet';
}

/** En butikk med egen rekkefølge på avdelingene, slik at listen følger veien du går i butikken. */
export type StoreProfile = { id: string; name: string; order: Department[] };

/** Gjør en rekkefølge gyldig: ukjente fjernes, dubletter fjernes, manglende avdelinger legges sist. */
export function normalizeOrder(order: readonly string[]): Department[] {
  const known = new Set<string>(DEPARTMENTS);
  const seen = new Set<string>();
  const out: Department[] = [];
  for (const d of order) {
    if (known.has(d) && !seen.has(d)) {
      seen.add(d);
      out.push(d as Department);
    }
  }
  for (const d of DEPARTMENTS) if (!seen.has(d)) out.push(d);
  return out;
}

/** Flytter en avdeling opp (-1) eller ned (+1). Utenfor kantene skjer ingenting. */
export function moveDepartment(order: Department[], index: number, delta: -1 | 1): Department[] {
  const to = index + delta;
  if (index < 0 || index >= order.length || to < 0 || to >= order.length) return order;
  const next = [...order];
  [next[index], next[to]] = [next[to], next[index]];
  return next;
}

/** Rekkefølgen for valgt butikk, eller standardrekkefølgen. */
export function orderFor(stores: StoreProfile[], activeId: string | null): readonly Department[] {
  const store = stores.find((s) => s.id === activeId);
  return store ? normalizeOrder(store.order) : DEPARTMENTS;
}
