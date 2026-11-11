import assert from 'node:assert/strict';
import {
  applyItem,
  dataToPlan,
  dataToRecipe,
  diffMaps,
  planToData,
  recipeToData,
  stateToItems,
  toMap,
  type StateRow,
} from '../src/lib/cloud/model.ts';
import type { FridgeState, Recipe, ShoppingState } from '../src/lib/types.ts';

const recipe: Recipe = {
  id: 'r1',
  title: 'Lasagne',
  servings: '4',
  sourceUrl: 'https://x.no/l',
  ingredients: ['500 g kjøttdeig'],
  steps: ['Stek.'],
  images: ['file:///a/b/recipe-images/img1.jpg'],
  createdAt: 5,
};

// Oppskrift: bare filnavn lagres, ny telefon bygger sin egen sti
const data = recipeToData(recipe);
assert.deepEqual(data.images, ['img1.jpg']);
const back = dataToRecipe('r1', data, 'file:///ny/mappe');
assert.deepEqual(back.images, ['file:///ny/mappe/img1.jpg']);
assert.equal(back.title, 'Lasagne');

// Plan: kalenderhendelsen er lokal og skal ikke overskrives av andres endringer
const entry = {
  id: 'p1',
  recipeId: 'r1',
  date: '2026-11-12T17:00:00.000Z',
  servings: 2,
  calendarEventId: 'EV1',
};
assert.equal('calendarEventId' in planToData(entry), false);
const merged = dataToPlan('p1', { ...planToData(entry), servings: 6 }, entry);
assert.equal(merged.calendarEventId, 'EV1');
assert.equal(merged.servings, 6);

// Handleliste + kjøleskap: rundtur via rader gir samme tilstand
const shopping: ShoppingState = {
  checked: ['m|mel'],
  hidden: ['m|salt'],
  overrides: { 'm|melk': '2 l lettmelk' },
  extras: [{ id: 'e1', text: 'Kaffe', checked: true }],
};
const fridge: FridgeState = { items: [{ id: 'f1', name: 'egg' }], assumeStaples: false };
const items = stateToItems(shopping, fridge);
let s: ShoppingState = { checked: [], hidden: [], overrides: {}, extras: [] };
let f: FridgeState = { items: [], assumeStaples: true };
for (const it of items.values())
  ({ shopping: s, fridge: f } = applyItem(s, f, { ...it, deleted: false }));
assert.deepEqual(s, shopping);
assert.deepEqual(f, fridge);

// Sletting av rader
const del = (kind: StateRow['kind'], key: string): StateRow => ({
  kind,
  key,
  value: {},
  deleted: true,
});
({ shopping: s, fridge: f } = applyItem(s, f, del('checked', 'm|mel')));
({ shopping: s, fridge: f } = applyItem(s, f, del('extra', 'e1')));
({ shopping: s, fridge: f } = applyItem(s, f, del('fridge', 'f1')));
({ shopping: s, fridge: f } = applyItem(s, f, del('override', 'm|melk')));
assert.deepEqual(s.checked, []);
assert.deepEqual(s.extras, []);
assert.deepEqual(f.items, []);
assert.deepEqual(s.overrides, {});
assert.deepEqual(s.hidden, ['m|salt']); // urørt

// Uendret rad gir samme objekt (ingen unødvendig oppdatering)
const same = applyItem(shopping, fridge, {
  kind: 'checked',
  key: 'm|mel',
  value: {},
  deleted: false,
});
assert.equal(same.shopping, shopping);

// Diff: bare endringer sendes, fjernede blir listet
const synced = new Map([
  ['a', 1],
  ['b', 2],
  ['c', 3],
]);
const next = new Map([
  ['a', 1],
  ['b', 20],
  ['d', 4],
]);
assert.deepEqual(diffMaps(synced, next), {
  upserts: [
    ['b', 20],
    ['d', 4],
  ],
  removed: ['c'],
});
const rm = toMap([recipe], recipeToData);
assert.deepEqual(diffMaps(rm, rm), { upserts: [], removed: [] });

console.log('cloud model OK');
