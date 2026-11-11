export type StructuredText = {
  title: string;
  servings?: string;
  ingredients: string[];
  steps: string[];
};

const ING_HEADER =
  /^(ingredienser|ingredients|dette trenger du|det trenger du|du trenger)\s*:?\s*$/i;
const STEP_HEADER =
  /^(fremgangsmåte|framgangsmåte|slik gjør du( det)?|tilberedning|instructions|directions|method|steps)\s*:?\s*$/i;
const BULLET = /^[\s•·●▪■◦*\-–—]+/;
const STEP_NUM = /^\s*(\d{1,2})\s*[.)]\s+/;
const QUANTITY = /^(\d|[½¼¾⅓⅔⅛]|en |ei |et |litt |noen |klype|\d+\s*[-–]\s*\d+)/i;
const SERVINGS = /(\d+(?:\s*[-–]\s*\d+)?)\s*(porsjoner|porsjon|personer|servings?)/i;

const clean = (l: string) => l.replace(/\s+/g, ' ').trim();

/** Gjør rå OCR-linjer om til tittel, ingredienser og fremgangsmåte (best effort). */
export function structureRecipeText(rawLines: string[]): StructuredText {
  const lines = rawLines
    .flatMap((l) => l.split('\n'))
    .map(clean)
    .filter(Boolean);
  const ingIdx = lines.findIndex((l) => ING_HEADER.test(l));
  const stepIdx = lines.findIndex((l) => STEP_HEADER.test(l));

  let head: string[] = [];
  let ing: string[] = [];
  let steps: string[] = [];

  if (ingIdx >= 0 || stepIdx >= 0) {
    if (ingIdx >= 0 && (stepIdx < 0 || ingIdx < stepIdx)) {
      head = lines.slice(0, ingIdx);
      ing = lines.slice(ingIdx + 1, stepIdx >= 0 ? stepIdx : undefined);
      steps = stepIdx >= 0 ? lines.slice(stepIdx + 1) : [];
    } else {
      // Fremgangsmåte står før ingredienser (eller ingredienser mangler).
      head = lines.slice(0, stepIdx);
      steps = lines.slice(stepIdx + 1, ingIdx >= 0 ? ingIdx : undefined);
      ing = ingIdx >= 0 ? lines.slice(ingIdx + 1) : [];
    }
  } else {
    // Ingen overskrifter: første linje er tittel, mengdelinjer er ingredienser.
    head = lines.slice(0, 1);
    for (const l of lines.slice(1)) {
      (QUANTITY.test(l.replace(BULLET, '')) && !STEP_NUM.test(l) ? ing : steps).push(l);
    }
  }

  const title = head.find((l) => !SERVINGS.test(l)) ?? head[0] ?? '';
  const servings = [...head, ...lines].map((l) => SERVINGS.exec(l)?.[1]).find(Boolean);

  const ingredients = ing.map((l) => clean(l.replace(BULLET, ''))).filter(Boolean);

  // OCR gir visuelle linjer: slå sammen linjer som fortsetter et nummerert steg.
  const merged: string[] = [];
  const numbered = steps.some((l) => STEP_NUM.test(l));
  for (const l of steps) {
    const text = clean(l.replace(BULLET, ''));
    if (!text) continue;
    if (numbered && !STEP_NUM.test(l) && merged.length) merged[merged.length - 1] += ` ${text}`;
    else merged.push(text.replace(STEP_NUM, ''));
  }

  return { title, servings, ingredients, steps: merged };
}
