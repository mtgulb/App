/**
 * Synk mellom lokal lagring og familiens delte data (Supabase).
 *
 * Prinsipper:
 * - Lokal lagring er alltid sannheten for skjermene; appen virker uten nett.
 * - Endringer sendes til serveren etter et lite opphold. Feiler det, prøves det igjen senere.
 * - Endringer fra andre kommer inn i sanntid og via en full henting ved start/aktivering.
 * - Hver rad har et serverstyrt tidsstempel; sist skrevet vinner per rad.
 * - Bilder ligger i privat fillagring, én mappe per husholdning.
 */
import { Directory, File, Paths } from 'expo-file-system';
import Storage from 'expo-sqlite/kv-store';
import { useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import type { RealtimeChannel, Session } from '@supabase/supabase-js';
import { applyRemote, getState, onStateChange, type State } from '../store';
import { getClient } from './client';
import { isCloudConfigured } from './config';
import {
  applyItem,
  dataToPlan,
  dataToRecipe,
  diffMaps,
  planToData,
  recipeToData,
  stateToItems,
  toMap,
  type PlanData,
  type RecipeData,
  type StateItem,
  type StateRow,
} from './model';

const BUCKET = 'recipe-images';

export type Member = { userId: string; role: 'owner' | 'member'; displayName: string };
export type CloudState = {
  status: 'off' | 'loading' | 'signedOut' | 'noHousehold' | 'ready';
  /** Pågående synk. */
  syncing: boolean;
  error?: string;
  email?: string;
  userId?: string;
  household?: { id: string; name: string; inviteCode: string; role: 'owner' | 'member' };
  members: Member[];
  lastSync?: number;
};

let cloud: CloudState = {
  status: isCloudConfigured ? 'loading' : 'off',
  syncing: false,
  members: [],
};
const subs = new Set<() => void>();
function setCloud(patch: Partial<CloudState>) {
  cloud = { ...cloud, ...patch };
  subs.forEach((f) => f());
}

export function useCloud(): CloudState {
  return useSyncExternalStore(
    (cb) => {
      subs.add(cb);
      return () => subs.delete(cb);
    },
    () => cloud,
  );
}

// ---------------------------------------------------------------------------
// Hjelpere
// ---------------------------------------------------------------------------

const imageDir = () => {
  const dir = new Directory(Paths.document, 'recipe-images');
  if (!dir.exists) dir.create();
  return dir;
};
const imageDirUri = () => imageDir().uri.replace(/\/$/, '');

/** Gjør tekniske feil om til norske meldinger. */
export function friendlyError(e: unknown): string {
  const m = String((e as { message?: string })?.message ?? e);
  if (/Invalid login credentials/i.test(m)) return 'Feil e-post eller passord.';
  if (/already registered|already been registered/i.test(m))
    return 'Det finnes allerede en konto med denne e-posten. Logg inn i stedet.';
  if (/Password should be at least/i.test(m)) return 'Passordet er for kort (minst 6 tegn).';
  if (/valid email|invalid email|Unable to validate email/i.test(m))
    return 'Ugyldig e-postadresse.';
  if (/Email not confirmed/i.test(m))
    return 'E-posten er ikke bekreftet. Slå av «Confirm email» i Supabase, eller bekreft via e-posten.';
  if (/already_member/.test(m)) return 'Du er allerede med i en husholdning.';
  if (/too_many_attempts/.test(m)) return 'For mange forsøk. Prøv igjen om en time.';
  if (/not_owner/.test(m)) return 'Bare eieren kan gjøre dette.';
  if (/Failed to fetch|Network request failed|fetch failed/i.test(m))
    return 'Ingen kontakt med serveren. Sjekk nettet.';
  return m;
}

// ---------------------------------------------------------------------------
// Synkstatus for gjeldende husholdning
// ---------------------------------------------------------------------------

type Ctx = {
  hid: string;
  synced: {
    recipes: Map<string, RecipeData>;
    plan: Map<string, PlanData>;
    items: Map<string, StateItem>;
  };
  uploaded: Set<string>;
  channel: RealtimeChannel;
  unsubscribeLocal: () => void;
  timer: ReturnType<typeof setTimeout> | null;
  pushing: boolean;
  dirty: boolean;
};
let ctx: Ctx | null = null;

const lastPullKey = (hid: string) => `cloud_last_pull_${hid}`;
const uploadedKey = (hid: string) => `cloud_uploaded_${hid}`;

function nextMaps(s: State) {
  return {
    recipes: toMap(s.recipes, recipeToData),
    plan: toMap(s.plan, planToData),
    items: stateToItems(s.shopping, s.fridge),
  };
}

async function uploadImages(c: Ctx, recipeIds: string[]) {
  const client = getClient();
  const s = getState();
  for (const id of recipeIds) {
    const recipe = s.recipes.find((r) => r.id === id);
    if (!recipe) continue;
    for (const uri of recipe.images) {
      const name = uri.split('/').pop()!;
      if (c.uploaded.has(name)) continue;
      const file = new File(uri);
      if (!file.exists) continue;
      const bytes = await file.arrayBuffer();
      const { error } = await client.storage
        .from(BUCKET)
        .upload(`${c.hid}/${name}`, bytes, { contentType: 'image/jpeg', upsert: true });
      if (error) throw error;
      c.uploaded.add(name);
      Storage.setItemSync(uploadedKey(c.hid), JSON.stringify([...c.uploaded]));
    }
  }
}

/** Sender alt som er endret lokalt siden sist. */
async function push(c: Ctx) {
  if (c.pushing) {
    c.dirty = true;
    return;
  }
  c.pushing = true;
  setCloud({ syncing: true });
  try {
    do {
      c.dirty = false;
      const client = getClient();
      const now = nextMaps(getState());
      const r = diffMaps(c.synced.recipes, now.recipes);
      const p = diffMaps(c.synced.plan, now.plan);
      const i = diffMaps(c.synced.items, now.items);

      await uploadImages(
        c,
        r.upserts.map(([id]) => id),
      );

      const write = async (table: string, rows: object[]) => {
        if (rows.length === 0) return;
        const { error } = await client.from(table).upsert(rows);
        if (error) throw error;
      };
      await write('recipes', [
        ...r.upserts.map(([id, data]) => ({ household_id: c.hid, id, data, deleted: false })),
        ...r.removed.map((id) => ({
          household_id: c.hid,
          id,
          data: c.synced.recipes.get(id)!,
          deleted: true,
        })),
      ]);
      await write('plan_entries', [
        ...p.upserts.map(([id, data]) => ({ household_id: c.hid, id, data, deleted: false })),
        ...p.removed.map((id) => ({
          household_id: c.hid,
          id,
          data: c.synced.plan.get(id)!,
          deleted: true,
        })),
      ]);
      await write('state_items', [
        ...i.upserts.map(([, it]) => ({
          household_id: c.hid,
          kind: it.kind,
          key: it.key,
          value: it.value,
          deleted: false,
        })),
        ...i.removed.map((k) => {
          const it = c.synced.items.get(k)!;
          return {
            household_id: c.hid,
            kind: it.kind,
            key: it.key,
            value: it.value,
            deleted: true,
          };
        }),
      ]);

      // Alt gikk bra: serveren er nå lik det vi sendte.
      c.synced = now;
    } while (c.dirty);
    setCloud({ error: undefined, lastSync: Date.now() });
  } catch (e) {
    c.dirty = true;
    setCloud({ error: friendlyError(e) });
    scheduleRetry(c, 30_000);
  } finally {
    c.pushing = false;
    setCloud({ syncing: false });
  }
}

function scheduleRetry(c: Ctx, ms: number) {
  if (c.timer) clearTimeout(c.timer);
  c.timer = setTimeout(() => {
    c.timer = null;
    if (ctx === c) void push(c);
  }, ms);
}

async function downloadMissingImages(hid: string, names: string[]) {
  const client = getClient();
  let changed = false;
  for (const name of new Set(names)) {
    const dest = new File(imageDir(), name);
    if (dest.exists) continue;
    try {
      const { data, error } = await client.storage
        .from(BUCKET)
        .createSignedUrl(`${hid}/${name}`, 600);
      if (error || !data) continue;
      await File.downloadFileAsync(data.signedUrl, dest);
      changed = true;
    } catch {
      // Bildet hentes neste gang.
    }
  }
  // Gi skjermene beskjed om at filene nå finnes.
  if (changed) applyRemote((s) => ({ ...s, recipes: [...s.recipes] }));
}

type Table = 'recipes' | 'plan_entries' | 'state_items';
type DbRow = Record<string, unknown> & { updated_at?: string };

/** Bruker rader fra serveren på lokal tilstand og oppdaterer `synced`. */
function applyRows(c: Ctx, table: Table, rows: DbRow[]) {
  const wantImages: string[] = [];
  applyRemote((s) => {
    let next = s;
    for (const row of rows) {
      const deleted = Boolean(row.deleted);
      if (table === 'recipes') {
        const id = String(row.id);
        const data = row.data as RecipeData;
        if (deleted) {
          c.synced.recipes.delete(id);
          next = { ...next, recipes: next.recipes.filter((r) => r.id !== id) };
        } else {
          c.synced.recipes.set(id, data);
          wantImages.push(...(data.images ?? []));
          const local = next.recipes.find((r) => r.id === id);
          if (local && JSON.stringify(recipeToData(local)) === JSON.stringify(data)) continue;
          const recipe = dataToRecipe(id, data, imageDirUri());
          next = {
            ...next,
            recipes: local
              ? next.recipes.map((r) => (r.id === id ? recipe : r))
              : [recipe, ...next.recipes],
          };
        }
      } else if (table === 'plan_entries') {
        const id = String(row.id);
        const data = row.data as PlanData;
        if (deleted) {
          c.synced.plan.delete(id);
          next = { ...next, plan: next.plan.filter((e) => e.id !== id) };
        } else {
          c.synced.plan.set(id, data);
          const local = next.plan.find((e) => e.id === id);
          if (local && JSON.stringify(planToData(local)) === JSON.stringify(data)) continue;
          const entry = dataToPlan(id, data, local);
          next = {
            ...next,
            plan: local ? next.plan.map((e) => (e.id === id ? entry : e)) : [...next.plan, entry],
          };
        }
      } else {
        const item: StateRow = {
          kind: row.kind as StateRow['kind'],
          key: String(row.key),
          value: (row.value as Record<string, unknown>) ?? {},
          deleted,
        };
        const id = `${item.kind}::${item.key}`;
        if (deleted) c.synced.items.delete(id);
        else c.synced.items.set(id, { kind: item.kind, key: item.key, value: item.value });
        const r = applyItem(next.shopping, next.fridge, item);
        if (r.shopping !== next.shopping || r.fridge !== next.fridge) {
          next = { ...next, shopping: r.shopping, fridge: r.fridge };
        }
      }
    }
    return next;
  });
  if (wantImages.length) void downloadMissingImages(c.hid, wantImages);
}

/** Henter endringer fra serveren (alt første gang, deretter bare nyere rader). */
async function pull(c: Ctx) {
  const client = getClient();
  const since = Storage.getItemSync(lastPullKey(c.hid));
  let newest = since ?? '';
  for (const table of ['recipes', 'plan_entries', 'state_items'] as const) {
    let q = client.from(table).select('*').eq('household_id', c.hid);
    if (since) q = q.gt('updated_at', since);
    const { data, error } = await q;
    if (error) throw error;
    const rows = (data ?? []) as DbRow[];
    applyRows(c, table, rows);
    for (const r of rows) if (r.updated_at && r.updated_at > newest) newest = r.updated_at;
  }
  if (newest) Storage.setItemSync(lastPullKey(c.hid), newest);
}

async function loadMembers(hid: string) {
  const { data, error } = await getClient()
    .from('household_members')
    .select('user_id, role, display_name')
    .eq('household_id', hid);
  if (error) return;
  setCloud({
    members: (data ?? []).map((m) => ({
      userId: m.user_id as string,
      role: m.role as 'owner' | 'member',
      displayName: (m.display_name as string) || 'Uten navn',
    })),
  });
}

async function resync() {
  const c = ctx;
  if (!c) return;
  setCloud({ syncing: true });
  try {
    await pull(c);
    await push(c);
    setCloud({ error: undefined, lastSync: Date.now() });
  } catch (e) {
    setCloud({ error: friendlyError(e) });
  } finally {
    setCloud({ syncing: false });
  }
}

function stopSync() {
  const c = ctx;
  ctx = null;
  if (!c) return;
  if (c.timer) clearTimeout(c.timer);
  c.unsubscribeLocal();
  void getClient().removeChannel(c.channel);
}

async function startSync(hid: string) {
  stopSync();
  const client = getClient();
  const uploaded = new Set<string>(
    JSON.parse(Storage.getItemSync(uploadedKey(hid)) ?? '[]') as string[],
  );
  const channel = client.channel(`household-${hid}`);
  const c: Ctx = {
    hid,
    synced: { recipes: new Map(), plan: new Map(), items: new Map() },
    uploaded,
    channel,
    unsubscribeLocal: () => {},
    timer: null,
    pushing: false,
    dirty: false,
  };
  ctx = c;

  for (const table of ['recipes', 'plan_entries', 'state_items'] as const) {
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table, filter: `household_id=eq.${hid}` },
      (payload) => {
        if (ctx === c && payload.new && Object.keys(payload.new).length) {
          applyRows(c, table, [payload.new as DbRow]);
        }
      },
    );
  }
  channel.on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'household_members', filter: `household_id=eq.${hid}` },
    () => void loadMembers(hid),
  );
  channel.subscribe();

  // Lokale endringer sendes etter et kort opphold.
  c.unsubscribeLocal = onStateChange((_prev, _next, remote) => {
    if (remote || ctx !== c) return;
    if (c.timer) clearTimeout(c.timer);
    c.timer = setTimeout(() => {
      c.timer = null;
      void push(c);
    }, 1200);
  });

  await resync();
}

// ---------------------------------------------------------------------------
// Innlogging og husholdning
// ---------------------------------------------------------------------------

async function loadHousehold(session: Session | null) {
  if (!session) {
    stopSync();
    setCloud({
      status: 'signedOut',
      email: undefined,
      userId: undefined,
      household: undefined,
      members: [],
    });
    return;
  }
  const client = getClient();
  setCloud({ email: session.user.email ?? undefined, userId: session.user.id });
  const { data, error } = await client
    .from('household_members')
    .select('role, households(id, name, invite_code)')
    .eq('user_id', session.user.id)
    .maybeSingle();
  if (error) {
    setCloud({ status: 'noHousehold', error: friendlyError(error) });
    return;
  }
  const h = data?.households as unknown as
    { id: string; name: string; invite_code: string } | null | undefined;
  if (!data || !h) {
    stopSync();
    setCloud({ status: 'noHousehold', household: undefined, members: [], error: undefined });
    return;
  }
  setCloud({
    status: 'ready',
    household: {
      id: h.id,
      name: h.name,
      inviteCode: h.invite_code,
      role: data.role as 'owner' | 'member',
    },
    error: undefined,
  });
  await loadMembers(h.id);
  await startSync(h.id);
}

let started = false;

/** Starter familiedeling hvis den er satt opp. Trygt å kalle flere ganger. */
export function initCloud() {
  if (!isCloudConfigured || started) return;
  started = true;
  const client = getClient();
  void client.auth.getSession().then(({ data }) => loadHousehold(data.session));
  client.auth.onAuthStateChange((event, session) => {
    // Unngå dobbel lasting ved start; oppdateringer av token endrer ikke husholdningen.
    if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') void loadHousehold(session);
  });
  AppState.addEventListener('change', (s) => {
    if (s === 'active') void resync();
  });
}

async function run<T>(fn: () => Promise<T>): Promise<T | undefined> {
  setCloud({ error: undefined });
  try {
    return await fn();
  } catch (e) {
    setCloud({ error: friendlyError(e) });
    return undefined;
  }
}

export const signUp = (email: string, password: string) =>
  run(async () => {
    const { data, error } = await getClient().auth.signUp({ email: email.trim(), password });
    if (error) throw error;
    // Uten bekreftelse får vi økt med en gang. Ellers må e-posten bekreftes først.
    if (!data.session) {
      throw new Error(
        'Konto opprettet, men e-posten må bekreftes først. Slå av «Confirm email» i Supabase for enklere innlogging.',
      );
    }
  });

export const signIn = (email: string, password: string) =>
  run(async () => {
    const { error } = await getClient().auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw error;
  });

export const signOut = () =>
  run(async () => {
    stopSync();
    await getClient().auth.signOut();
  });

async function refreshAfter<T>(fn: () => Promise<T>): Promise<T | undefined> {
  const result = await run(fn);
  const { data } = await getClient().auth.getSession();
  await loadHousehold(data.session);
  return result;
}

export const createHousehold = (name: string, displayName: string) =>
  refreshAfter(async () => {
    const { error } = await getClient().rpc('create_household', {
      p_name: name,
      p_display_name: displayName,
    });
    if (error) throw error;
  });

/** Returnerer false hvis koden ikke finnes. */
export async function joinHousehold(code: string, displayName: string): Promise<boolean> {
  let ok = false;
  await refreshAfter(async () => {
    const { data, error } = await getClient().rpc('join_household', {
      p_code: code,
      p_display_name: displayName,
    });
    if (error) throw error;
    if (!data) throw new Error('Fant ingen husholdning med den koden.');
    ok = true;
  });
  return ok;
}

export const leaveHousehold = () =>
  refreshAfter(async () => {
    stopSync();
    const { error } = await getClient().rpc('leave_household');
    if (error) throw error;
  });

export const regenerateInviteCode = () =>
  refreshAfter(async () => {
    if (!cloud.household) return;
    const { error } = await getClient().rpc('regenerate_invite_code', {
      p_household: cloud.household.id,
    });
    if (error) throw error;
  });
