import assert from 'node:assert/strict';
import { mergedFromRecipes, timesOnList } from '../src/lib/shoppingList.ts';
import type { Recipe, ShoppingRecipeAdd } from '../src/lib/types.ts';

const lasagne: Recipe = {
  id: 'r1',
  title: 'Lasagne',
  servings: '4',
  ingredients: ['500 g kjøttdeig', '2 dl melk', '3 egg'],
  steps: [],
  images: [],
  createdAt: 0,
};
const suppe: Recipe = {
  ...lasagne,
  id: 'r2',
  title: 'Suppe',
  ingredients: ['1 l vann', '2 dl melk'],
};
const txt = (a: ShoppingRecipeAdd[], r = [lasagne, suppe]) =>
  mergedFromRecipes(a, r)
    .map((m) => m.text)
    .sort();

// Én gang
assert.deepEqual(txt([{ id: 'a', recipeId: 'r1', servings: 4 }]), [
  '2 dl melk',
  '3 egg',
  '500 g kjøttdeig',
]);
// To ganger samme oppskrift = to middager: ingrediensene dobles
assert.deepEqual(
  txt([
    { id: 'a', recipeId: 'r1', servings: 4 },
    { id: 'b', recipeId: 'r1', servings: 4 },
  ]),
  ['1 kg kjøttdeig', '4 dl melk', '6 egg'],
);
// Ulike porsjoner skaleres hver for seg: 4 + 2 porsjoner = 1,5 × grunnoppskriften
assert.deepEqual(
  txt([
    { id: 'a', recipeId: 'r1', servings: 4 },
    { id: 'b', recipeId: 'r1', servings: 2 },
  ]),
  ['3 dl melk', '4½ egg', '750 g kjøttdeig'],
);
// Ulike oppskrifter med felles vare slås sammen
assert.ok(
  txt([
    { id: 'a', recipeId: 'r1', servings: 4 },
    { id: 'b', recipeId: 'r2', servings: 4 },
  ]).includes('4 dl melk'),
);
// Slettet oppskrift hoppes over uten å krasje
assert.deepEqual(txt([{ id: 'a', recipeId: 'finnes-ikke', servings: 4 }]), []);
assert.deepEqual(txt([]), []);
// Antall ganger
const two = [
  { id: 'a', recipeId: 'r1', servings: 4 },
  { id: 'b', recipeId: 'r1', servings: 4 },
];
assert.equal(timesOnList(two, 'r1'), 2);
assert.equal(timesOnList(two, 'r2'), 0);
console.log('shopping list OK');
