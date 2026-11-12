import assert from 'node:assert/strict';
import { addToTrash, daysLeft, pruneTrash, takeFromTrash } from '../src/lib/trash.ts';
import type { Recipe } from '../src/lib/types.ts';

const DAY = 86400000;
const r = (id: string): Recipe => ({
  id,
  title: id,
  ingredients: [],
  steps: [],
  images: [],
  createdAt: 0,
});
const t0 = 1_000_000_000_000;

let list = addToTrash(
  [],
  r('a'),
  [{ id: 'p', recipeId: 'a', date: '2026-01-01T10:00:00Z', calendarEventId: 'x' }],
  t0,
);
list = addToTrash(list, r('b'), [], t0 + DAY);
assert.deepEqual(
  list.map((x) => x.recipe.id),
  ['b', 'a'],
); // nyeste først
// Samme oppskrift slettet på nytt erstatter, ikke dupliserer
assert.equal(addToTrash(list, r('a'), [], t0 + 2 * DAY).length, 2);
// 30 dager
assert.equal(daysLeft(list[1]!, t0 + 10 * DAY), 20);
assert.equal(pruneTrash(list, t0 + 29 * DAY).length, 2);
assert.deepEqual(
  pruneTrash(list, t0 + 30 * DAY + 1).map((x) => x.recipe.id),
  ['b'],
); // a er 30 dager gammel
assert.equal(pruneTrash(list, t0 + 40 * DAY).length, 0);
// Gjenoppretting fjerner kalenderkobling og tar den ut av listen
const { rest, item } = takeFromTrash(list, 'a');
assert.equal(rest.length, 1);
assert.equal(item!.plan.length, 1);
assert.equal('calendarEventId' in item!.plan[0]!, false);
assert.equal(takeFromTrash(list, 'zzz').item, null);
console.log('trash OK');
