import assert from 'node:assert/strict';
import { findTimers, formatClock } from '../src/lib/durations.ts';
import { departmentOf } from '../src/lib/departments.ts';
import {
  dateInDays,
  daysUntil,
  expiringSoon,
  expiryLabel,
  expiryState,
} from '../src/lib/inventory.ts';
import {
  DEFAULT_SETTINGS,
  defaultServings,
  householdLabel,
  householdPortions,
} from '../src/lib/portions.ts';

// --- Tidtakere i steg ---
const t = (s: string) => findTimers(s).map((x) => x.seconds);
assert.deepEqual(t('Stek i 10 minutter.'), [600]);
assert.deepEqual(t('Kok i 10–15 min'), [600]); // laveste verdi
assert.deepEqual(t('La hvile i 1,5 time'), [5400]);
assert.deepEqual(t('Stek 1 time og 30 minutter'), [5400]); // slått sammen
assert.deepEqual(t('Visp 30 sek, la stå 5 min'), [30, 300]);
assert.deepEqual(t('Ovnen på 200 grader, 5 dl melk, 2 ss olje'), []);
assert.deepEqual(t('La stå i minuttvis'), []); // ikke «minutt» midt i et ord
assert.equal(formatClock(75), '01:15');
assert.equal(formatClock(3725), '1:02:05');
assert.equal(formatClock(-5), '00:00');

// --- Avdelinger ---
const d = departmentOf;
assert.equal(d('400 g laksefilet'.replace('400 g ', '')), 'Kjøtt og fisk');
assert.equal(d('cherrytomater'), 'Frukt og grønt');
assert.equal(d('hvetemjøl'), 'Brød og bakevarer');
assert.equal(d('melk'), 'Meieri og egg');
assert.equal(d('frosne erter'), 'Frys');
assert.equal(d('soyasaus'), 'Krydder og sauser');
assert.equal(d('kyllingfilet'), 'Kjøtt og fisk');
assert.equal(d('revet ost'), 'Meieri og egg');
assert.equal(d('løk, finhakket'), 'Frukt og grønt');
assert.equal(d('pasta'), 'Tørrvarer og hermetikk');
assert.equal(d('noe helt ukjent'), 'Annet');
assert.equal(d('tomatpuré'), 'Tørrvarer og hermetikk'); // ikke «tomat»
assert.equal(d('kokosmelk'), 'Tørrvarer og hermetikk'); // ikke «melk»

// --- Utløpsdato (valgfri) ---
const now = new Date(2026, 10, 12, 15, 0); // 12. nov 2026
assert.equal(dateInDays(3, now), '2026-11-15');
assert.equal(daysUntil('2026-11-12', now), 0);
assert.equal(daysUntil('2026-11-11', now), -1);
assert.equal(expiryState({ expires: undefined }, now), null); // uten dato: ingen status
assert.equal(expiryState({ expires: '2026-11-10' }, now), 'expired');
assert.equal(expiryState({ expires: '2026-11-14' }, now), 'soon');
assert.equal(expiryState({ expires: '2026-12-01' }, now), 'ok');
const items = [
  { id: '1', name: 'melk', expires: '2026-11-13' },
  { id: '2', name: 'egg' },
  { id: '3', name: 'kjøtt', expires: '2026-11-11' },
  { id: '4', name: 'ost', expires: '2027-01-01' },
];
assert.deepEqual(
  expiringSoon(items, now).map((i) => i.name),
  ['kjøtt', 'melk'],
);
assert.equal(expiryLabel('2026-11-13', now), 'Utløper i morgen');
assert.equal(expiryLabel('2026-11-09', now), 'Utløpt for 3 dager siden');

// --- Porsjoner for husholdningen ---
assert.equal(householdPortions({ adults: 2, children: 0, childFactor: 0.5 }), 2);
assert.equal(householdPortions({ adults: 2, children: 2, childFactor: 0.5 }), 3);
assert.equal(householdPortions({ adults: 2, children: 1, childFactor: 0.5 }), 3); // 2,5 rundes opp
assert.equal(householdPortions({ adults: 0, children: 0, childFactor: 0.5 }), 1);
assert.equal(householdLabel({ adults: 2, children: 2 }), '2 voksne og 2 barn');
assert.equal(householdLabel({ adults: 1, children: 0 }), '1 voksen');
// Før brukeren har satt noe, brukes oppskriftens egne porsjoner
assert.equal(defaultServings(DEFAULT_SETTINGS, { servings: '6' }), 6);
assert.equal(
  defaultServings(
    { ...DEFAULT_SETTINGS, configured: true, adults: 2, children: 2 },
    { servings: '6' },
  ),
  3,
);
console.log('features OK');

// --- Påminnelser (valgfrie) ---
import { planReminders } from '../src/lib/reminders.ts';
{
  const recipe = {
    id: 'r',
    title: 'Laksefilet i ovn',
    ingredients: ['400 g laksefilet', '2 dl fløte'],
    steps: [],
    images: [],
    createdAt: 0,
    servings: '4',
  };
  const nowR = new Date(2026, 10, 12, 10, 0);
  const plan = [
    { id: 'p1', recipeId: 'r', date: new Date(2026, 10, 14, 17, 0).toISOString(), servings: 3 },
    { id: 'p2', recipeId: 'r', date: new Date(2026, 10, 12, 9, 0).toISOString() }, // i fortiden
    { id: 'p3', recipeId: 'r', date: new Date(2027, 5, 1, 17, 0).toISOString() }, // for langt frem
  ];
  const inv = [
    { id: 'f', name: 'laks', place: 'freezer' as const },
    { id: 'g', name: 'fløte', place: 'fridge' as const },
  ];
  // Av som standard: ingenting planlegges
  assert.deepEqual(
    planReminders({
      plan,
      recipes: [recipe],
      inventory: inv,
      freezerIds: ['freezer'],
      settings: { ...DEFAULT_SETTINGS, remindEvening: false, remindToday: false },
      now: nowR,
    }),
    [],
  );
  const both = planReminders({
    plan,
    recipes: [recipe],
    inventory: inv,
    freezerIds: ['freezer'],
    settings: { ...DEFAULT_SETTINGS, remindEvening: true, remindToday: true },
    now: nowR,
  });
  assert.equal(both.length, 2);
  assert.equal(both[0].title, 'I morgen: Laksefilet i ovn');
  assert.equal(both[0].at.getDate(), 13);
  assert.equal(both[0].at.getHours(), 20);
  assert.match(both[0].body, /laks/); // fryser-påminnelse
  assert.doesNotMatch(both[0].body, /fløte/); // fløte ligger i kjøleskapet
  assert.equal(both[1].at.getHours(), 15);
  assert.match(both[1].body, /3 porsjoner/);
  // Middag tidlig på dagen: påminnelse en time før
  const early = planReminders({
    plan: [{ id: 'e', recipeId: 'r', date: new Date(2026, 10, 14, 12, 0).toISOString() }],
    recipes: [recipe],
    inventory: [],
    freezerIds: [],
    settings: { ...DEFAULT_SETTINGS, remindEvening: false, remindToday: true },
    now: nowR,
  });
  assert.equal(early[0].at.getHours(), 11);
  // Ingen frysevare: generell tekst
  const noFreezer = planReminders({
    plan,
    recipes: [recipe],
    inventory: [],
    freezerIds: [],
    settings: { ...DEFAULT_SETTINGS, remindEvening: true, remindToday: false },
    now: nowR,
  });
  assert.match(noFreezer[0].body, /Sjekk/);
}
console.log('reminders OK');

// --- Lenker: samme side, ulik skrivemåte ---
import { normalizeUrl } from '../src/lib/urls.ts';
assert.equal(
  normalizeUrl('https://www.matprat.no/oppskrifter/laks/?utm_source=x#top'),
  'matprat.no/oppskrifter/laks',
);
assert.equal(normalizeUrl('matprat.no/oppskrifter/laks'), 'matprat.no/oppskrifter/laks');
assert.equal(normalizeUrl('https://x.no/a?b=2&a=1&fbclid=z'), 'x.no/a?a=1&b=2');
assert.notEqual(normalizeUrl('https://x.no/a'), normalizeUrl('https://x.no/b'));
console.log('urls OK');

// --- Lager: migrering og egne lager ---
import { freezerIds, migrateFridge } from '../src/lib/inventory.ts';
{
  // Nye brukere: ett felles lager
  const fresh = migrateFridge({});
  assert.deepEqual(fresh.storages, [{ id: 'main', name: 'Lager' }]);
  assert.equal(fresh.assumeStaples, true);
  // Eldre data: kjøleskap/fryser/skap beholdes, varer uten sted havner i kjøleskapet
  const old = migrateFridge({
    items: [
      { id: '1', name: 'melk' },
      { id: '2', name: 'laks', place: 'freezer' },
    ],
    assumeStaples: false,
  } as never);
  assert.deepEqual(
    old.storages.map((x) => x.id),
    ['fridge', 'freezer'],
  );
  assert.equal(old.items[0].place, 'fridge');
  assert.deepEqual(freezerIds(old.storages), ['freezer']);
  assert.equal(old.assumeStaples, false);
  // Varer som peker på et lager som ikke finnes, flyttes til det første
  const broken = migrateFridge({
    items: [{ id: '1', name: 'x', place: 'borte' }],
    storages: [
      { id: 'a', name: 'A' },
      { id: 'b', name: 'B' },
    ],
    assumeStaples: true,
  });
  assert.equal(broken.items[0].place, 'a');
  // Allerede migrert data røres ikke
  assert.deepEqual(migrateFridge(broken), broken);
}
console.log('storage migration OK');

// --- Midlertidig økt, adskilt fra lageret ---
import {
  addSessionItems,
  endSession,
  getSession,
  removeSessionItem,
  setUseStock,
  suggestionBasis,
  toggleStorageIncluded,
} from '../src/lib/session.ts';
{
  const stock = {
    items: [
      { id: '1', name: 'melk', place: 'a', expires: '2026-11-13' },
      { id: '2', name: 'laks', place: 'b' },
    ],
  };
  const today = new Date(2026, 10, 12);
  endSession();
  addSessionItems('egg, ost,  egg , ');
  assert.deepEqual(
    getSession().items.map((i) => i.name),
    ['egg', 'ost'],
  ); // delt på komma, uten dubletter
  // Lager og midlertidige varer slås sammen i forslagene
  let b = suggestionBasis(stock, getSession(), today);
  assert.deepEqual(b.names, ['melk', 'laks', 'egg', 'ost']);
  assert.deepEqual(b.soon, ['melk']); // bare lagervarer teller som «snart ut»
  // Velg bort et lager
  toggleStorageIncluded('b');
  b = suggestionBasis(stock, getSession(), today);
  assert.deepEqual(b.names, ['melk', 'egg', 'ost']);
  toggleStorageIncluded('b'); // slå på igjen
  // Uten lager: bare det man skrev inn
  setUseStock(false);
  b = suggestionBasis(stock, getSession(), today);
  assert.deepEqual(b.names, ['egg', 'ost']);
  assert.deepEqual(b.soon, []);
  // Samme vare på lager og i økten telles én gang
  setUseStock(true);
  addSessionItems('Melk');
  assert.equal(
    suggestionBasis(stock, getSession(), today).names.filter((n) => n.toLowerCase() === 'melk')
      .length,
    1,
  );
  // Fjerne enkeltvare
  removeSessionItem(getSession().items.find((i) => i.name === 'ost')!.id);
  assert.ok(!getSession().items.some((i) => i.name === 'ost'));
  // Avslutte økten nullstiller alt midlertidig – og lageret er uendret
  const before = JSON.stringify(stock);
  endSession();
  assert.deepEqual(getSession(), { items: [], useStock: true, excluded: [] });
  assert.equal(JSON.stringify(stock), before);
  assert.deepEqual(suggestionBasis(stock, getSession(), today).names, ['melk', 'laks']);
}
console.log('session OK');

// --- Egen butikkrekkefølge ---
import { DEPARTMENTS, moveDepartment, normalizeOrder, orderFor } from '../src/lib/departments.ts';
{
  assert.deepEqual(normalizeOrder([...DEPARTMENTS]), [...DEPARTMENTS]);
  // Manglende avdelinger legges sist, ukjente og dubletter fjernes
  const n = normalizeOrder(['Meieri og egg', 'Meieri og egg', 'Ukjent', 'Frys']);
  assert.deepEqual(n.slice(0, 2), ['Meieri og egg', 'Frys']);
  assert.equal(n.length, DEPARTMENTS.length);
  assert.equal(new Set(n).size, n.length);
  // Flytte
  const base = [...DEPARTMENTS];
  const up = moveDepartment(base, 2, -1);
  assert.equal(up[1], DEPARTMENTS[2]);
  assert.equal(up[2], DEPARTMENTS[1]);
  assert.equal(moveDepartment(base, 0, -1), base); // kan ikke flyttes ut av listen
  assert.equal(moveDepartment(base, base.length - 1, 1), base);
  assert.deepEqual(base, [...DEPARTMENTS]); // originalen røres ikke
  // Butikkvalg
  const stores = [{ id: 'k', name: 'Kiwi', order: ['Meieri og egg', 'Frukt og grønt'] as never }];
  assert.deepEqual(orderFor(stores, null), DEPARTMENTS); // ingen valgt = standard
  assert.deepEqual(orderFor(stores, 'finnes-ikke'), DEPARTMENTS);
  assert.equal(orderFor(stores, 'k')[0], 'Meieri og egg');
  assert.equal(orderFor(stores, 'k').length, DEPARTMENTS.length);
}
console.log('store order OK');

// --- Egne klokkeslett og utløpsvarsler ---
import { parseHm, planExpiryReminders } from '../src/lib/reminders.ts';
{
  assert.deepEqual(parseHm('07:45', [20, 0]), [7, 45]);
  assert.deepEqual(parseHm('25:00', [20, 0]), [20, 0]);
  assert.deepEqual(parseHm('tull', [9, 0]), [9, 0]);

  const recipe = {
    id: 'r',
    title: 'Pasta',
    ingredients: ['pasta'],
    steps: [],
    images: [],
    createdAt: 0,
    servings: '4',
  };
  const nowT = new Date(2026, 10, 12, 10, 0);
  const plan = [{ id: 'p', recipeId: 'r', date: new Date(2026, 10, 15, 18, 0).toISOString() }];
  const custom = planReminders({
    plan,
    recipes: [recipe],
    inventory: [],
    freezerIds: [],
    settings: {
      ...DEFAULT_SETTINGS,
      remindEvening: true,
      remindEveningTime: '18:30',
      remindToday: true,
      remindTodayTime: '12:00',
    },
    now: nowT,
  });
  assert.equal(custom[0].at.getHours(), 18);
  assert.equal(custom[0].at.getMinutes(), 30);
  assert.equal(custom[1].at.getHours(), 12);

  const inv = [
    { id: '1', name: 'melk', expires: '2026-11-16' },
    { id: '2', name: 'ost', expires: '2026-11-16' },
    { id: '3', name: 'laks', expires: '2026-11-20' },
    { id: '4', name: 'egg' }, // uten dato: aldri varsel
    { id: '5', name: 'gammel', expires: '2026-11-01' }, // utløpt: ikke varsle
  ];
  // Av som standard
  assert.deepEqual(
    planExpiryReminders({ inventory: inv, settings: DEFAULT_SETTINGS, now: nowT }),
    [],
  );
  const ex = planExpiryReminders({
    inventory: inv,
    settings: { ...DEFAULT_SETTINGS, remindExpiry: true, expiryDays: 2, expiryTime: '08:00' },
    now: nowT,
  });
  assert.equal(ex.length, 2); // ett per dag
  assert.equal(ex[0].at.getDate(), 14); // 2 dager før 16.
  assert.equal(ex[0].at.getHours(), 8);
  assert.match(ex[0].body, /melk, ost/);
  assert.equal(ex[1].title, 'laks går snart ut');
}
console.log('notification settings OK');
