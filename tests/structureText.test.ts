import assert from 'node:assert/strict';
import { structureRecipeText as s } from '../src/lib/structureText.ts';
let r = s([
  'Kjøttkaker i brun saus',
  '4 porsjoner',
  'Ingredienser',
  '• 500 g kjøttdeig',
  '1 ts salt',
  'Fremgangsmåte',
  '1. Bland deigen',
  'og stek.',
  '2) Lag saus.',
]);
assert.equal(r.title, 'Kjøttkaker i brun saus');
assert.equal(r.servings, '4');
assert.deepEqual(r.ingredients, ['500 g kjøttdeig', '1 ts salt']);
assert.deepEqual(r.steps, ['Bland deigen og stek.', 'Lag saus.']);
r = s(['Pannekaker', '3 egg', '5 dl melk', 'Visp alt sammen.', 'Stek i panne.']);
assert.equal(r.title, 'Pannekaker');
assert.deepEqual(r.ingredients, ['3 egg', '5 dl melk']);
assert.deepEqual(r.steps, ['Visp alt sammen.', 'Stek i panne.']);
r = s(['Suppe', 'Slik gjør du:', 'Kok.', 'Dette trenger du', 'vann']);
assert.deepEqual(r.steps, ['Kok.']);
assert.deepEqual(r.ingredients, ['vann']);
assert.deepEqual(s([]), { title: '', servings: undefined, ingredients: [], steps: [] });
console.log('structure OK');
