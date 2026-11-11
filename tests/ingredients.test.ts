import assert from 'node:assert/strict';
import {
  parseIngredient as P,
  formatIngredient as F,
  mergeIngredients as M,
  baseServings,
  scaledLines,
  formatQty,
} from '../src/lib/ingredients.ts';
const f = (s: string, k = 1) => F(P(s), k);
// parsing + skalering
assert.equal(f('500 g kjøttdeig'), '500 g kjøttdeig');
assert.equal(f('500 g kjøttdeig', 1.5), '750 g kjøttdeig');
assert.equal(f('1 1/2 dl melk', 2), '3 dl melk');
assert.equal(f('½ dl olje'), '½ dl olje');
assert.equal(f('1½ ss smør', 2), '3 ss smør');
assert.equal(f('0,5 l fløte', 3), '1½ l fløte');
assert.equal(f('2-3 ss soyasaus', 2), '4–6 ss soyasaus');
assert.equal(f('3 egg', 0.5), '1½ egg');
assert.equal(f('1 stk løk, finhakket', 2), '2 stk løk, finhakket');
assert.equal(f('1 pk à 400 g tomater', 2), '2 pk à 400 g tomater');
assert.equal(f('salt', 2), 'salt'); // uten mengde: uendret
assert.equal(f('ca. 200 g ost', 2), '400 g ost');
assert.equal(f('2 ts salt', 0.5), '1 ts salt');
assert.equal(formatQty(0.1), '¼');
assert.equal(baseServings({ servings: '4 porsjoner' }), 4);
assert.equal(baseServings({ servings: '6-8' }), 6);
assert.equal(baseServings({ servings: undefined }), 4);
// sammenslåing
const m = (l: [string, number][]) =>
  M(l.map(([s, factor]) => ({ parsed: P(s), factor }))).map((x) => x.text);
assert.deepEqual(
  m([
    ['2 dl melk', 1],
    ['3 dl melk', 1],
  ]),
  ['5 dl melk'],
);
assert.deepEqual(
  m([
    ['500 g kjøttdeig', 1],
    ['500 g kjøttdeig, hakket', 1],
  ]),
  ['1 kg kjøttdeig'],
);
assert.deepEqual(
  m([
    ['2 ss olje', 1],
    ['1 dl olje', 1],
  ]),
  ['1,3 dl olje'],
);
assert.deepEqual(
  m([
    ['1 stk løk', 1],
    ['200 g løk', 1],
  ]),
  ['løk (1 stk + 200 g)'],
);
assert.deepEqual(
  m([
    ['salt', 1],
    ['1 ts salt', 1],
  ]),
  ['1 ts salt'],
);
assert.deepEqual(m([['pepper', 1]]), ['pepper']);
assert.deepEqual(
  m([
    ['4 egg', 1],
    ['4 egg', 0.5],
  ]),
  ['6 egg'],
); // samme middag, ulike porsjoner
assert.deepEqual(
  m([
    ['1 dl fløte', 1],
    ['1 dl fløte', 2],
  ]),
  ['3 dl fløte'],
);
assert.deepEqual(scaledLines({ servings: '4', ingredients: ['400 g pasta', 'salt'] } as never, 2), [
  '200 g pasta',
  'salt',
]);
console.log('ingredients OK');

// --- Ingrediensrader (redigering) ---
import { rowFromLine, lineFromRow, UNIT_OPTIONS } from '../src/lib/ingredients.ts';
{
  const r = rowFromLine('1 1/2 dl melk');
  assert.deepEqual([r.qty, r.unit, r.name], ['1 1/2', 'dl', 'melk']);
  assert.equal(lineFromRow(r), '1 1/2 dl melk');
  const r2 = rowFromLine('2-3 ss soyasaus');
  assert.deepEqual([r2.qty, r2.unit, r2.name], ['2-3', 'ss', 'soyasaus']);
  const r3 = rowFromLine('salt');
  assert.deepEqual([r3.qty, r3.unit, r3.name], ['', '', 'salt']);
  assert.equal(lineFromRow(r3), 'salt');
  const r4 = rowFromLine('½ stk løk, finhakket');
  assert.deepEqual([r4.qty, r4.unit, r4.name], ['½', 'stk', 'løk, finhakket']);
  const r5 = rowFromLine('3 egg');
  assert.deepEqual([r5.qty, r5.unit, r5.name], ['3', '', 'egg']);
  // Rader uten navn gir ingen linje; redigert rad parses tilbake riktig
  assert.equal(lineFromRow({ id: 'x', qty: '2', unit: 'dl', name: '  ' }), '');
  assert.equal(lineFromRow({ id: 'x', qty: '1,5', unit: 'dl', name: 'fløte' }), '1,5 dl fløte');
  assert.equal(formatIngredientCheck('1,5 dl fløte', 2), '3 dl fløte');
  assert.ok(UNIT_OPTIONS.includes('dl'));
}
function formatIngredientCheck(line: string, f: number) {
  return F(P(line), f);
}
console.log('ingredient rows OK');
