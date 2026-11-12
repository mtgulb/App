/**
 * Tester databaseskjemaet og tilgangsstyringen (RLS) for familiedeling mot en lokal Postgres (PGlite).
 * Supabase sine innebygde deler (auth, storage, roller) etterlignes minimalt.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const A = '00000000-0000-4000-8000-00000000000a'; // eier
const B = '00000000-0000-4000-8000-00000000000b'; // medlem
const C = '00000000-0000-4000-8000-00000000000c'; // utenforstående

const db = new PGlite();

await db.exec(`
  create schema auth;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create role anon nologin;
  create role authenticated nologin;
  grant usage on schema public, auth to anon, authenticated;
  -- Supabase gir som standard alle rettigheter på nye tabeller; migreringen må fjerne dem.
  alter default privileges in schema public grant all on tables to anon, authenticated;
  alter default privileges in schema public grant all on functions to anon, authenticated;
  create schema storage;
  create table storage.buckets (id text primary key, name text, public boolean);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
  alter table storage.objects enable row level security;
  grant usage on schema storage to authenticated;
  grant select, insert, update, delete on storage.objects to authenticated;
  create publication supabase_realtime;
  insert into auth.users (id) values ('${A}'), ('${B}'), ('${C}');
`);

await db.exec(
  readFileSync(
    new URL('../supabase/migrations/20261112000000_family_sharing.sql', import.meta.url),
    'utf8',
  ),
);

async function as(user: string | null) {
  await db.exec('reset role');
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [user ?? '']);
  await db.exec(user ? 'set role authenticated' : 'set role anon');
}
const q = async (sql: string, params: unknown[] = []) =>
  (await db.query(sql, params)).rows as Record<string, any>[];
async function fails(fn: () => Promise<unknown>, pattern: RegExp, msg: string) {
  try {
    await fn();
  } catch (e) {
    assert.match(String((e as Error).message), pattern, msg);
    return;
  }
  assert.fail(`Skulle feilet: ${msg}`);
}

// --- Opprette og bli med -------------------------------------------------
await as(A);
const [{ create_household: hid }] = await q(
  `select create_household('Familien Hansen', 'Mat') as create_household`,
);
assert.ok(hid, 'A oppretter husholdning');
await fails(
  () => q(`select create_household('Til', 'x')`),
  /already_member/,
  'kan ikke være med i to husholdninger',
);
const [{ invite_code: code }] = await q('select invite_code from households');
assert.match(code, /^[0-9A-F]{10}$/, 'invitasjonskode har riktig format');

await as(C);
assert.equal((await q('select * from households')).length, 0, 'C ser ingen husholdninger');
assert.equal(
  (await q(`select join_household('FEILKODE99', 'C') as r`))[0].r,
  null,
  'feil kode gir null',
);
await fails(
  () => q(`insert into households (name, invite_code) values ('Hack', 'XXXXXXXXXX')`),
  /permission denied|row-level security/,
  'direkte innsetting av husholdning er forbudt',
);

await as(B);
await q(`select join_household($1, 'Partner')`, [
  code.slice(0, 5) + '-' + code.slice(5).toLowerCase(),
]); // med bindestrek og små bokstaver
assert.equal((await q('select * from household_members')).length, 2, 'B ser begge medlemmer');

// --- Delt data -----------------------------------------------------------
await as(A);
await q(`insert into recipes (household_id, id, data) values ($1, 'r1', '{"title":"Lasagne"}')`, [
  hid,
]);
await q(
  `insert into state_items (household_id, kind, key, value) values ($1, 'fridge', 'f1', '{"name":"melk"}')`,
  [hid],
);

await as(B);
assert.equal((await q('select * from recipes')).length, 1, 'B ser As oppskrift');
await q(`update recipes set data = '{"title":"Lasagne 2"}' where id = 'r1'`);
const [row] = await q('select data, updated_by from recipes');
assert.equal(row.data.title, 'Lasagne 2', 'B kan redigere');
assert.equal(row.updated_by, B, 'serveren setter hvem som endret');
// klienten kan ikke forfalske endret-av
await q(`update recipes set updated_by = $1 where id = 'r1'`, [A]);
assert.equal(
  (await q('select updated_by from recipes'))[0].updated_by,
  B,
  'updated_by kan ikke forfalskes',
);

await as(C);
assert.equal((await q('select * from recipes')).length, 0, 'C ser ingen oppskrifter');
assert.equal((await q('select * from state_items')).length, 0, 'C ser ikke kjøleskapet');
await fails(
  () => q(`insert into recipes (household_id, id, data) values ($1, 'evil', '{}')`, [hid]),
  /row-level security/,
  'C kan ikke skrive i andres husholdning',
);
await q(`update recipes set data = '{"hacked":true}'`); // påvirker 0 rader
await as(A);
assert.equal(
  (await q(`select data->>'title' as t from recipes`))[0].t,
  'Lasagne 2',
  'C endret ingenting',
);
await fails(
  () => q(`delete from recipes where id = 'r1'`),
  /permission denied/,
  'oppskrifter slettes ikke direkte (merkes deleted)',
);

// anonyme brukere har ingen tilgang
await as(null);
await fails(() => q('select * from recipes'), /permission denied/, 'anon har ingen tilgang');

// --- Eier-rettigheter ----------------------------------------------------
await as(B);
await q(`update households set name = 'Hacket'`);
await as(A);
assert.equal(
  (await q('select name from households'))[0].name,
  'Familien Hansen',
  'medlem kan ikke endre navn',
);
await q(`update households set name = 'Hansen'`);
assert.equal((await q('select name from households'))[0].name, 'Hansen', 'eier kan endre navn');
await as(B);
await fails(
  () => q('select regenerate_invite_code($1)', [hid]),
  /not_owner/,
  'medlem kan ikke bytte kode',
);
await as(A);
const [{ regenerate_invite_code: newCode }] = await q('select regenerate_invite_code($1)', [hid]);
assert.notEqual(newCode, code, 'eier kan bytte kode');
await as(C);
assert.equal(
  (await q(`select join_household($1, 'C') as r`, [code]))[0].r,
  null,
  'gammel kode virker ikke lenger',
);

// --- Lagring av bilder ---------------------------------------------------
await as(A);
await q(`insert into storage.objects (bucket_id, name) values ('recipe-images', $1)`, [
  `${hid}/bilde.jpg`,
]);
await as(C);
assert.equal((await q(`select * from storage.objects`)).length, 0, 'C ser ikke bilder');
await fails(
  () =>
    q(`insert into storage.objects (bucket_id, name) values ('recipe-images', $1)`, [
      `${hid}/hack.jpg`,
    ]),
  /row-level security/,
  'C kan ikke laste opp til andres mappe',
);
await fails(
  () =>
    q(
      `insert into storage.objects (bucket_id, name) values ('recipe-images', 'ikke-en-uuid/x.jpg')`,
    ),
  /row-level security/,
  'ugyldig sti avvises uten krasj',
);
await as(B);
assert.equal((await q(`select * from storage.objects`)).length, 1, 'B ser bilder');

// --- Begrensning av gjetting --------------------------------------------
await as(C);
for (let i = 0; i < 8; i++) {
  assert.equal(
    (await q(`select join_household('GJETTER${i}', 'C') as r`))[0].r,
    null,
    'gjetting avvises',
  );
}
await fails(
  () => q(`select join_household('GJETTER99', 'C')`),
  /too_many_attempts/,
  'for mange forsøk stenges',
);

// --- Forlate ------------------------------------------------------------
await as(A);
await q('select leave_household()');
await as(B);
assert.equal(
  (await q(`select role from household_members where user_id = $1`, [B]))[0].role,
  'owner',
  'B blir ny eier',
);
await q('select leave_household()');
await db.exec('reset role');
assert.equal((await q('select * from households')).length, 0, 'siste medlem sletter husholdningen');
assert.equal((await q('select * from recipes')).length, 0, 'og alle dataene');

// --- Sletting av konto ---------------------------------------------------
// Frisk start: ny husholdning med to medlemmer.
await db.exec('reset role');
await as(A);
const [{ create_household: h2 }] = await q(
  `select create_household('Slettetest', 'A') as create_household`,
);
const [{ invite_code: code2 }] = await q('select invite_code from households');
await as(B);
await q(`select join_household($1, 'B')`, [code2]);
await as(A);
await q(`insert into recipes (household_id, id, data) values ($1, 'del1', '{}')`, [h2]);
await as(null);
await fails(
  () => q('select delete_my_account()'),
  /permission denied/,
  'ikke-innlogget kan ikke slette',
);
await as(A);
await q('select delete_my_account()');
await db.exec('reset role');
assert.equal(
  (await q(`select * from auth.users where id = $1`, [A])).length,
  0,
  'innloggingen er slettet',
);
assert.equal(
  (await q(`select * from household_members where user_id = $1`, [A])).length,
  0,
  'medlemskapet er borte',
);
assert.equal(
  (await q(`select updated_by from recipes where id = 'del1'`))[0].updated_by,
  null,
  'ingen spor av hvem som skrev',
);
assert.equal(
  (await q(`select role from household_members where user_id = $1`, [B]))[0].role,
  'owner',
  'B overtar som eier',
);
assert.equal(
  (await q(`select count(*)::int as n from recipes`))[0].n,
  1,
  'delte data består for de andre',
);
await as(B);
await q('select delete_my_account()');
await db.exec('reset role');
assert.equal((await q('select * from households')).length, 0, 'siste medlem sletter husholdningen');
assert.equal((await q('select * from recipes')).length, 0, 'og dataene');
assert.equal((await q(`select * from auth.users where id = $1`, [B])).length, 0);

console.log('rls OK');
await db.close();
