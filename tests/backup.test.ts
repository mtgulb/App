import assert from 'node:assert/strict';
import { createBackup, parseBackup } from '../src/lib/backup.ts';
import { DEFAULT_SETTINGS } from '../src/lib/portions.ts';
import { migrateFridge } from '../src/lib/inventory.ts';
import type { State } from '../src/lib/store.ts';

const empty: State = {
  recipes: [],
  plan: [],
  shopping: { checked: [], extras: [], hidden: [], overrides: {}, fromRecipes: [] },
  fridge: migrateFridge({}),
  settings: DEFAULT_SETTINGS,
};
const state: State = {
  ...empty,
  recipes: [
    {
      id: 'r1',
      title: 'Lasagne',
      ingredients: ['500 g kjøttdeig'],
      steps: ['Stek'],
      images: ['file:///lokal.jpg', 'https://example.org/a.jpg'],
      createdAt: 1,
      favorite: true,
      rating: 5,
    },
  ],
  plan: [
    {
      id: 'p1',
      recipeId: 'r1',
      date: '2026-11-13T17:00:00.000Z',
      calendarEventId: 'abc',
      servings: 4,
    },
    { id: 'p2', recipeId: 'borte', date: '2026-11-14T17:00:00.000Z' },
  ],
  shopping: {
    ...empty.shopping,
    extras: [{ id: 'e1', text: 'melk', checked: false }],
    fromRecipes: [{ id: 'a1', recipeId: 'r1', servings: 4 }],
  },
};

const text = createBackup(state, new Date('2026-11-12T10:00:00Z'));
const res = parseBackup(text, empty);
assert.ok(res.ok);
if (res.ok) {
  assert.equal(res.createdAt, '2026-11-12T10:00:00.000Z');
  assert.deepEqual(res.state.recipes[0]!.images, ['https://example.org/a.jpg']); // lokalt bilde tas ikke med
  assert.equal(res.state.recipes[0]!.favorite, true);
  assert.equal(res.state.plan.length, 1); // oppskriften «borte» finnes ikke
  assert.equal('calendarEventId' in res.state.plan[0]!, false);
  assert.equal(res.state.plan[0]!.servings, 4);
  assert.equal(res.state.shopping.fromRecipes.length, 1);
  assert.equal(res.summary.recipes, 1);
  assert.equal(res.summary.shoppingItems, 2);
}
// Mangler felt: fyller på med standardverdier
const partial = JSON.stringify({ app: 'panful', version: 1, data: { recipes: [], plan: [] } });
const p = parseBackup(partial, empty);
assert.ok(p.ok && p.state.settings.adults === DEFAULT_SETTINGS.adults);
// Feil: ikke JSON, annen app, for ny versjon, ødelagte oppskrifter
assert.deepEqual(parseBackup('hei', empty), { ok: false, reason: 'notBackup' });
assert.deepEqual(parseBackup('{"app":"annet"}', empty), { ok: false, reason: 'notBackup' });
assert.deepEqual(parseBackup(JSON.stringify({ app: 'panful', version: 99, data: {} }), empty), {
  ok: false,
  reason: 'tooNew',
});
assert.deepEqual(
  parseBackup(
    JSON.stringify({ app: 'panful', version: 1, data: { recipes: [{ id: 1 }], plan: [] } }),
    empty,
  ),
  { ok: false, reason: 'corrupt' },
);
console.log('backup OK');

import { keepLocalImages } from '../src/lib/backup.ts';
const restored = res.ok ? res.state : empty;
const merged = keepLocalImages(restored, state);
assert.deepEqual(merged.recipes[0]!.images, ['https://example.org/a.jpg', 'file:///lokal.jpg']);
assert.deepEqual(keepLocalImages(restored, empty).recipes[0]!.images, [
  'https://example.org/a.jpg',
]);
console.log('backup images OK');
