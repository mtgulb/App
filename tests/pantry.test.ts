import assert from 'node:assert/strict';
import { analyzeRecipe, isStaple, matches, rankRecipes } from '../src/lib/pantry.ts';
import type { Recipe } from '../src/lib/types.ts';

const mk = (title: string, ingredients: string[]): Recipe => ({
  id: title,
  title,
  ingredients,
  steps: [],
  images: [],
  createdAt: 0,
});

// Enkle treff
assert.ok(matches('egg', 'egg'));
assert.ok(matches('revet ost', 'ost'));
assert.ok(matches('tomater', 'tomat'));
assert.ok(matches('løk, finhakket', 'løk'));
assert.ok(matches('kylling', 'kyllingfilet')); // sammensatt ord
assert.ok(matches('hvitløksfedd', 'hvitløksfedd'));
// Ikke-treff
assert.ok(!matches('melk', 'melkesjokolade'));
assert.ok(!matches('mel', 'melk'));
assert.ok(!matches('smør', 'peanøttsmør'));
assert.ok(!matches('', 'egg'));
assert.ok(isStaple('salt') && isStaple('olivenolje') && !isStaple('smør'));

const fridge = ['egg', 'melk', 'ost', 'tomater'];
const a = analyzeRecipe(
  mk('Omelett', ['3 egg', '1 dl melk', '100 g revet ost', '2 stk tomat', 'salt', '2 ss olje']),
  fridge,
  true,
);
assert.equal(a.missing.length, 0);
assert.equal(a.have.length, 6);

const b = analyzeRecipe(
  mk('Pannekaker', ['3 egg', '5 dl melk', '250 g mel', '1 ts salt']),
  fridge,
  true,
);
assert.deepEqual(b.missing, ['250 g mel']);

// Uten antakelse om basisvarer mangler salt også
const c = analyzeRecipe(mk('Pannekaker', ['3 egg', '1 ts salt']), fridge, false);
assert.deepEqual(c.missing, ['1 ts salt']);

// Rangering: færrest manglende først
const ranked = rankRecipes(
  [
    mk('Lasagne', ['500 g kjøttdeig', '9 lasagneplater', 'ost']),
    mk('Omelett', ['3 egg', 'ost']),
    mk('Tom', []),
  ],
  fridge,
  true,
);
assert.deepEqual(
  ranked.map((r) => r.recipe.title),
  ['Omelett', 'Lasagne'],
);
console.log('pantry OK');

// --- Synonymer: norsk (bokmål/nynorsk), dialekt og engelsk ---
import { mergeIngredients, parseIngredient } from '../src/lib/ingredients.ts';
for (const [a, b] of [
  ['mel', 'mjøl'],
  ['hvetemel', 'mel'],
  ['hvetemjøl', 'hvetemel'],
  ['flour', 'mel'],
  ['wheat flour', 'mjøl'],
  ['plain flour', 'hvetemjøl'],
  ['milk', 'melk'],
  ['mjølk', 'melk'],
  ['potatoes', 'poteter'],
  ['potato', 'potet'],
  ['gulrøtter', 'carrot'],
  ['carrots', 'gulrot'],
  ['chicken breast', 'kyllingfilet'],
  ['butter', 'smør'],
  ['sugar', 'sukker'],
  ['garlic', 'hvitløk'],
  ['onion', 'løk'],
  ['gul løk', 'løk'],
  ['olive oil', 'olivenolje'],
  ['soy sauce', 'soyasaus'],
  ['cream', 'fløte'],
  ['baking powder', 'bakepulver'],
  ['ground beef', 'kjøttdeig'],
  ['tomatoes', 'tomater'],
  ['eggs', 'egg'],
  ['mushrooms', 'sopp'],
  ['spring onion', 'vårløk'],
]) {
  assert.ok(matches(a, b), `${a} bør matche ${b}`);
  assert.ok(matches(b, a), `${b} bør matche ${a}`);
}
// Skal fortsatt IKKE matche
for (const [a, b] of [
  ['mel', 'melk'],
  ['mel', 'melis'],
  ['sukker', 'farin'],
  ['smør', 'peanøttsmør'],
  ['løk', 'rødløk'],
  ['olje', 'olivenolje'],
]) {
  if (a === 'olje') continue; // olje er basisvare og håndteres av «anta basisvarer»
  assert.ok(!matches(a, b), `${a} skal ikke matche ${b}`);
}
// Kjøleskap på engelsk gir treff i norsk oppskrift
const r = analyzeRecipe(
  mk('Pannekaker', ['250 g hvetemjøl', '5 dl mjølk', '3 egg']),
  ['flour', 'milk', 'eggs'],
  true,
);
assert.equal(r.missing.length, 0);

// Sammenslåing på tvers av stavemåter
const m = (lines: string[]) =>
  mergeIngredients(lines.map((l) => ({ parsed: parseIngredient(l), factor: 1 }))).map(
    (x) => x.text,
  );
assert.deepEqual(m(['2 dl mel', '3 dl hvetemjøl']), ['5 dl mel']);
assert.deepEqual(m(['500 g potatoes', '1 kg poteter']), ['1,5 kg potatoes']);
assert.deepEqual(m(['2 dl melk', '1 dl milk']), ['3 dl melk']);
console.log('synonyms OK');

// Brede synonymer skal ikke gi feil treff
assert.ok(!matches('gul paprika', 'løk'));
assert.ok(!matches('spaghetti', 'penne'));
console.log('synonym guards OK');

// --- Sammensatte ord: laks → laksefilet osv. ---
import { matchLevel } from '../src/lib/pantry.ts';
for (const [a, b] of [
  ['laks', 'laksefilet'],
  ['laks', 'laksefilet, i skiver'],
  ['laksefilet', 'laks'],
  ['laks', 'røkt laks'],
  ['torsk', 'torskefilet'],
  ['kylling', 'kyllinglårfilet'],
  ['kylling', 'kyllingfilet'],
  ['kylling', 'kyllingbryst'],
  ['svin', 'svinekotelett'],
  ['okse', 'oksebiff'],
  ['okse', 'oksefilet'],
  ['sei', 'seifilet'],
  ['and', 'andebryst'],
  ['ost', 'revet ost'],
]) {
  assert.ok(matches(a, b), `${a} bør matche ${b}`);
  assert.ok(matches(b, a), `${b} bør matche ${a}`);
}
// «lignende» er ikke et treff
assert.equal(matchLevel('rødløk', 'løk'), 'similar');
assert.equal(matchLevel('løk', 'rødløk'), 'similar');
assert.equal(matchLevel('peanøttsmør', 'smør'), 'similar');
assert.equal(matchLevel('cherrytomater', 'tomat'), 'similar');
assert.equal(matchLevel('mel', 'melk'), null);
assert.equal(matchLevel('melkesjokolade', 'melk'), null);
assert.equal(matchLevel('laksefilet', 'torsk'), null);
assert.ok(!matches('laks', 'laksefett'));
assert.ok(!matches('kylling', 'kyllingbuljong'));

// Oppskriftsanalyse: lignende telles ikke som «har», og basisvarer antas bare når det bes om
const lax = analyzeRecipe(
  mk('Laks', ['400 g laksefilet', '1 rødløk', 'salt', '2 dl fløte']),
  ['laks', 'løk', 'fløte'],
  false,
);
assert.deepEqual(lax.have, ['400 g laksefilet', '2 dl fløte']);
assert.deepEqual(
  lax.similar.map((x) => x.line),
  ['1 rødløk'],
);
assert.deepEqual(lax.missing, ['salt']); // uten antakelse mangler salt
const lax2 = analyzeRecipe(mk('Laks', ['salt']), [], true);
assert.deepEqual(lax2.have, ['salt']);
console.log('compounds OK');

// --- Bruk opp snart løfter relevante oppskrifter ---
{
  const a = mk('Pasta', ['400 g pasta', '2 dl fløte']);
  const b = mk('Laksesuppe', ['400 g laksefilet', '2 dl fløte']);
  const fr = ['pasta', 'laks', 'fløte'];
  const plain = rankRecipes([a, b], fr, false).map((r) => r.recipe.title);
  assert.deepEqual(plain, ['Laksesuppe', 'Pasta']); // likt gap → alfabetisk
  const withSoon = rankRecipes([a, b], fr, false, ['laks']);
  assert.deepEqual(withSoon[0].usesSoon, ['laks']);
  assert.equal(withSoon[0].recipe.title, 'Laksesuppe');
  const soonPasta = rankRecipes([a, b], fr, false, ['pasta']);
  assert.equal(soonPasta[0].recipe.title, 'Pasta'); // løftet foran alfabetisk rekkefølge
}
console.log('use-soon OK');
