import assert from 'node:assert/strict';
import {
  allTags,
  filterRecipes,
  formatMinutes,
  hasActiveFilters,
  NO_FILTERS,
  parseTags,
  sortRecipes,
} from '../src/lib/recipeFilter.ts';
import type { Recipe } from '../src/lib/types.ts';

const mk = (id: string, extra: Partial<Recipe> = {}): Recipe => ({
  id,
  title: id,
  ingredients: ['1 egg'],
  steps: [],
  images: [],
  createdAt: 0,
  ...extra,
});

const rs = [
  mk('Lasagne', {
    createdAt: 3,
    minutes: 90,
    tags: ['helg', 'ovn'],
    rating: 5,
    favorite: true,
    lastCookedAt: 100,
  }),
  mk('Omelett', {
    createdAt: 1,
    minutes: 10,
    tags: ['hverdag', 'rask'],
    rating: 3,
    lastCookedAt: 300,
  }),
  mk('Suppe', { createdAt: 2, tags: ['hverdag'], ingredients: ['2 gulrøtter'] }),
  mk('Tacos', { createdAt: 4, minutes: 30, tags: ['hverdag'], rating: 4, favorite: true }),
];
const ids = (l: Recipe[]) => l.map((r) => r.id);

// Filtre
assert.deepEqual(ids(filterRecipes(rs, { ...NO_FILTERS, favoritesOnly: true })), [
  'Lasagne',
  'Tacos',
]);
assert.deepEqual(ids(filterRecipes(rs, { ...NO_FILTERS, maxMinutes: 30 })), ['Omelett', 'Tacos']); // uten tid utelates
assert.deepEqual(ids(filterRecipes(rs, { ...NO_FILTERS, tag: 'hverdag' })), [
  'Omelett',
  'Suppe',
  'Tacos',
]);
assert.deepEqual(ids(filterRecipes(rs, { ...NO_FILTERS, query: 'gulrot' })), ['Suppe']); // «gulrot» finner «gulrøtter»
assert.deepEqual(
  ids(
    filterRecipes([mk('Laks', { ingredients: ['400 g laksefilet'] })], {
      ...NO_FILTERS,
      query: 'laks',
    }),
  ),
  ['Laks'],
);
assert.deepEqual(ids(filterRecipes(rs, { ...NO_FILTERS, query: 'flour' })), []); // ingen mel i testdata
assert.deepEqual(ids(filterRecipes(rs, { ...NO_FILTERS, query: 'rask' })), ['Omelett']); // søk i tagger
assert.deepEqual(
  ids(filterRecipes(rs, { query: '', favoritesOnly: true, maxMinutes: 60, tag: 'hverdag' })),
  ['Tacos'],
);
assert.equal(hasActiveFilters(NO_FILTERS), false);
assert.equal(hasActiveFilters({ ...NO_FILTERS, tag: 'x' }), true);

// Sortering
assert.deepEqual(ids(sortRecipes(rs, 'newest')), ['Tacos', 'Lasagne', 'Suppe', 'Omelett']);
assert.deepEqual(ids(sortRecipes(rs, 'lastCooked')).slice(0, 2), ['Omelett', 'Lasagne']);
assert.deepEqual(ids(sortRecipes(rs, 'rating')), ['Lasagne', 'Tacos', 'Omelett', 'Suppe']);
assert.deepEqual(ids(sortRecipes(rs, 'time')), ['Omelett', 'Tacos', 'Lasagne', 'Suppe']); // ukjent tid sist
assert.deepEqual(ids(sortRecipes(rs, 'alpha')), ['Lasagne', 'Omelett', 'Suppe', 'Tacos']);
assert.deepEqual(ids(rs), ['Lasagne', 'Omelett', 'Suppe', 'Tacos']); // originalen røres ikke

// Tagger
assert.deepEqual(allTags(rs), ['hverdag', 'helg', 'ovn', 'rask']);
assert.deepEqual(parseTags(' Hverdag, Barnevennlig ,hverdag,'), ['hverdag', 'barnevennlig']);
assert.equal(formatMinutes(45), '45 min');
assert.equal(formatMinutes(60), '1 t');
assert.equal(formatMinutes(95), '1 t 35 min');
console.log('recipe filter OK');
