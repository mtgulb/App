import assert from 'node:assert/strict';
import { pickLocale, translate } from '../src/i18n/index.ts';
import { nb } from '../src/i18n/nb/index.ts';
import { en } from '../src/i18n/en/index.ts';

const dict = nb as Record<string, string>;
const params = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

// Språkvalg
assert.equal(pickLocale('nb-NO'), 'nb');
assert.equal(pickLocale('nn-NO'), 'nb');
assert.equal(pickLocale('no'), 'nb');
assert.equal(pickLocale('en-GB'), 'nb'); // engelsk ikke ferdig ennå
assert.equal(pickLocale('en-GB', ['nb', 'en']), 'en');
assert.equal(pickLocale('de-DE', ['nb', 'en']), 'nb');
assert.equal(pickLocale(undefined), 'nb');

// Oversettelse: parametre, flertall, fallback
assert.equal(translate('nb', 'z' as never), 'z'); // ukjent nøkkel gir nøkkelen
dict['t.hi'] = 'Hei {name}';
dict['t.n_one'] = '{count} vare';
dict['t.n_other'] = '{count} varer';
assert.equal(translate('nb', 't.hi' as never, { name: 'Ola' }), 'Hei Ola');
assert.equal(translate('nb', 't.n' as never, { count: 1 }), '1 vare');
assert.equal(translate('nb', 't.n' as never, { count: 0 }), '0 varer');
assert.equal(translate('nb', 't.n' as never, { count: 5 }), '5 varer');
assert.equal(translate('en', 't.hi' as never, { name: 'Ola' }), 'Hei Ola'); // fallback til norsk
en['t.hi'] = 'Hello {name}';
assert.equal(translate('en', 't.hi' as never, { name: 'Ola' }), 'Hello Ola');
delete en['t.hi'];
delete dict['t.hi'];
delete dict['t.n_one'];
delete dict['t.n_other'];

// Alle språk: bare kjente nøkler, samme parametre som norsk, flertallsformer komplett
for (const [k, v] of Object.entries(en)) {
  assert.ok(k in dict, `engelsk nøkkel finnes ikke på norsk: ${k}`);
  assert.deepEqual(params(v!), params(dict[k]!), `parametre er ulike for ${k}`);
}
for (const k of Object.keys(dict)) {
  if (k.endsWith('_one')) assert.ok(`${k.slice(0, -4)}_other` in dict, `mangler _other for ${k}`);
  if (k.endsWith('_other')) assert.ok(`${k.slice(0, -6)}_one` in dict, `mangler _one for ${k}`);
}
console.log('i18n OK');
