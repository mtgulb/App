/**
 * Felles ordforråd for å gjenkjenne at ulike ord betyr samme vare:
 * bokmål/nynorsk/dialekt og engelsk («mel», «mjøl», «hvetemel», «flour» …).
 * Brukes både til kjøleskap-treff og til å slå sammen like varer i handlelisten.
 */

/** Ord som beskriver tilstand/mengde og ikke selve varen. */
const STOP = new Set([
  'hakket',
  'finhakket',
  'grovhakket',
  'revet',
  'finrevet',
  'skivet',
  'i',
  'til',
  'av',
  'ferske',
  'fersk',
  'frisk',
  'friske',
  'frossen',
  'frosne',
  'stor',
  'store',
  'liten',
  'små',
  'ca',
  'evt',
  'eventuelt',
  'gjerne',
  'og',
  'med',
  'litt',
  'hel',
  'hele',
  'kokt',
  'kokte',
  'stekt',
  'tørket',
  'malt',
  'presset',
  'pressede',
  'terninger',
  'skiver',
  'strimler',
  'smaksetter',
  'etter',
  'smak',
  'chopped',
  'grated',
  'sliced',
  'fresh',
  'frozen',
  'large',
  'small',
  'of',
  'the',
  'a',
]);

/** Første ord i hver gruppe er standardformen; resten er varianter. */
const GROUPS: string[][] = [
  ['mel', 'mjøl', 'hvetemel', 'hvetemjøl', 'flour'],
  ['sukker', 'sugar', 'strøsukker', 'sukkeret'],
  ['farin', 'muscovado', 'brunsukker'],
  ['melis', 'florsukker', 'powderedsugar'],
  ['smør', 'butter'],
  ['melk', 'mjølk', 'milk', 'helmelk', 'lettmelk', 'skummamelk'],
  ['fløte', 'fløyte', 'cream', 'matfløte', 'kjøkkenfløte'],
  ['egg', 'eggs'],
  ['løk', 'onion', 'onions'],
  ['hvitløk', 'garlic', 'hvitløksfedd'],
  ['tomat', 'tomato', 'tomatoes', 'tomater'],
  ['potet', 'poteter', 'potato', 'potatoes', 'potatis'],
  ['gulrot', 'gulrøtter', 'gulrøtt', 'carrot', 'carrots'],
  ['kylling', 'chicken'],
  ['kyllingfilet', 'kyllingbryst', 'chickenbreast'],
  ['kjøttdeig', 'mince', 'minced', 'groundbeef', 'kjøttfarse'],
  ['ost', 'cheese'],
  ['ris', 'rice'],
  ['pasta'],
  ['olje', 'oil', 'matolje', 'rapsolje'],
  ['olivenolje', 'oliveoil'],
  ['salt'],
  ['pepper', 'blackpepper', 'sortpepper'],
  ['vann', 'water'],
  ['sitron', 'lemon'],
  ['lime'],
  ['agurk', 'cucumber'],
  ['paprika', 'bellpepper'],
  ['bakepulver', 'bakingpowder'],
  ['natron', 'bakingsoda', 'bicarbonate'],
  ['gjær', 'yeast', 'tørrgjær'],
  ['vaniljesukker', 'vanillasugar'],
  ['kanel', 'cinnamon'],
  ['ingefær', 'ginger'],
  ['basilikum', 'basil'],
  ['persille', 'parsley'],
  ['timian', 'thyme'],
  ['rosmarin', 'rosemary'],
  ['koriander', 'coriander', 'cilantro'],
  ['spisskummen', 'kumin', 'cumin'],
  ['soyasaus', 'soysauce', 'soya', 'soyasauce'],
  ['honning', 'honey'],
  ['eddik', 'vinegar'],
  ['kokosmelk', 'coconutmilk'],
  ['rømme', 'rømmen', 'sourcream'],
  ['yoghurt', 'yogurt', 'jogurt'],
  ['spinat', 'spinach'],
  ['brokkoli', 'broccoli'],
  ['blomkål', 'cauliflower'],
  ['squash', 'zucchini', 'courgette'],
  ['aubergine', 'eggplant'],
  ['sopp', 'champignon', 'mushroom', 'mushrooms', 'soppen'],
  ['erter', 'peas', 'ert'],
  ['mais', 'corn', 'sweetcorn'],
  ['laks', 'salmon'],
  ['torsk', 'cod'],
  ['reker', 'shrimp', 'prawns', 'rekene'],
  ['skinke', 'ham'],
  ['pølse', 'pølser', 'sausage', 'sausages'],
  ['havregryn', 'oats', 'rolledoats'],
  ['mandler', 'almonds', 'mandel'],
  ['tunfisk', 'tuna'],
  ['kikerter', 'chickpeas', 'kikert'],
  ['linser', 'lentils', 'linse'],
  ['brød', 'bread'],
  ['tortilla', 'tortillas', 'wraps'],
  ['tomatpuré', 'tomatpure', 'tomatpuree', 'tomatoepaste', 'tomatopaste'],
  ['buljong', 'stock', 'broth', 'bouillon', 'kraft'],
  ['majones', 'mayonnaise', 'mayo'],
  ['sennep', 'mustard'],
  ['sjokolade', 'chocolate'],
  ['kakao', 'cocoa'],
  ['maisenna', 'cornstarch', 'cornflour', 'maizena'],
  ['purre', 'leek', 'purreløk'],
  ['selleri', 'celery'],
  ['kål', 'cabbage', 'hvitkål'],
  ['rødbeter', 'rødbete', 'beetroot', 'beets'],
  ['feta', 'fetaost'],
  ['cremefraiche', 'crèmefraîche', 'cremefraîche'],
  ['svinekjøtt', 'pork', 'svin'],
  ['storfekjøtt', 'beef', 'okse', 'oksekjøtt'],
  ['vårløk', 'springonion', 'greenonion', 'scallion'],
  ['søtpotet', 'sweetpotato'],
  ['rødløk', 'redonion'],
  ['bacon'],
  ['nudler', 'noodles', 'nudel'],
  ['oregano'],
  ['chili'],
  ['kardemomme', 'cardamom'],
  ['muskat', 'nutmeg'],
  ['sirup', 'syrup'],
];

/** Flerordsuttrykk som slås sammen til ett ord før vi deler opp teksten. */
const PHRASES: [string, string][] = [
  ['all-purpose flour', 'mel'],
  ['all purpose flour', 'mel'],
  ['plain flour', 'mel'],
  ['wheat flour', 'mel'],
  ['white flour', 'mel'],
  ['olive oil', 'olivenolje'],
  ['black pepper', 'pepper'],
  ['sort pepper', 'pepper'],
  ['brown sugar', 'farin'],
  ['brunt sukker', 'farin'],
  ['powdered sugar', 'melis'],
  ['icing sugar', 'melis'],
  ['baking powder', 'bakepulver'],
  ['baking soda', 'natron'],
  ['soy sauce', 'soyasaus'],
  ['sour cream', 'rømme'],
  ['coconut milk', 'kokosmelk'],
  ['tomato paste', 'tomatpuré'],
  ['chicken breast', 'kyllingfilet'],
  ['chicken fillet', 'kyllingfilet'],
  ['kylling filet', 'kyllingfilet'],
  ['kylling lårfilet', 'kyllinglårfilet'],
  ['ground beef', 'kjøttdeig'],
  ['minced meat', 'kjøttdeig'],
  ['gul løk', 'løk'],
  ['green onion', 'vårløk'],
  ['spring onion', 'vårløk'],
  ['sweet potato', 'søtpotet'],
  ['red onion', 'rødløk'],
  ['bell pepper', 'paprika'],
  ['creme fraiche', 'cremefraiche'],
  ['crème fraîche', 'cremefraiche'],
  ['fedd hvitløk', 'hvitløk'],
  ['rolled oats', 'havregryn'],
];

function stem(w: string): string {
  if (w.length > 5 && w.endsWith('ene')) return w.slice(0, -3);
  if (w.length > 4 && (w.endsWith('er') || w.endsWith('en'))) return w.slice(0, -2);
  return w;
}

const CANON = new Map<string, string>();
for (const [canonical, ...variants] of GROUPS) {
  CANON.set(canonical, canonical);
  CANON.set(stem(canonical), canonical);
  for (const v of variants) {
    CANON.set(v, canonical);
    CANON.set(stem(v), canonical);
  }
}

/** Standardform for ett ord: kjent synonym, ellers ordstammen. */
export function canonicalWord(word: string): string {
  const w = word.toLowerCase();
  return CANON.get(w) ?? CANON.get(stem(w)) ?? stem(w);
}

/** Deler opp en varetekst i standardiserte ord, uten tilstandsord («revet», «hakket» …). */
export function normalizeTokens(name: string): string[] {
  let s = name
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ')
    .split(',')[0];
  for (const [from, to] of PHRASES) s = s.split(from).join(to);
  return s
    .split(/[^a-zæøåéèêç0-9]+/)
    .filter((w) => w && !STOP.has(w))
    .map(canonicalWord);
}
