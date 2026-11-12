-- Familiedeling: husholdninger, medlemmer og delte data.
-- All tilgang styres av radnivå-sikkerhet (RLS): bare medlemmer ser og endrer husholdningens data.
-- Klienten bruker kun den offentlige anon-nøkkelen; hemmeligheter ligger aldri i appen.

-- ---------------------------------------------------------------------------
-- Tabeller
-- ---------------------------------------------------------------------------

create table public.households (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 80),
  invite_code text not null unique,
  created_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now()
);

create table public.household_members (
  household_id uuid not null references public.households (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  role         text not null default 'member' check (role in ('owner', 'member')),
  display_name text not null default '' check (char_length(display_name) <= 60),
  joined_at    timestamptz not null default now(),
  primary key (household_id, user_id)
);

-- Hver bruker kan bare være med i én husholdning om gangen.
create unique index household_members_one_per_user on public.household_members (user_id);

create table public.recipes (
  household_id uuid not null references public.households (id) on delete cascade,
  id           text not null,
  data         jsonb not null,
  deleted      boolean not null default false,
  updated_at   timestamptz not null default now(),
  updated_by   uuid default auth.uid(),
  primary key (household_id, id)
);

create table public.plan_entries (
  household_id uuid not null references public.households (id) on delete cascade,
  id           text not null,
  data         jsonb not null,
  deleted      boolean not null default false,
  updated_at   timestamptz not null default now(),
  updated_by   uuid default auth.uid(),
  primary key (household_id, id)
);

-- Handleliste og kjøleskap lagres som enkeltrader (sist skrevet vinner per rad),
-- slik at to personer kan krysse av ulike varer samtidig uten å overskrive hverandre.
create table public.state_items (
  household_id uuid not null references public.households (id) on delete cascade,
  kind         text not null check (kind in ('checked', 'hidden', 'override', 'extra', 'fridge', 'storage', 'recipeAdd', 'setting')),
  key          text not null,
  value        jsonb not null default '{}'::jsonb,
  deleted      boolean not null default false,
  updated_at   timestamptz not null default now(),
  updated_by   uuid default auth.uid(),
  primary key (household_id, kind, key)
);

-- Tidsstempel og hvem som endret settes alltid av serveren, aldri av klienten.
create function public.touch_row() returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- Kontosletting setter dette for å kunne fjerne «endret av» uten at triggeren skriver det tilbake.
  if current_setting('app.skip_touch', true) = 'on' then
    return new;
  end if;
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;

create trigger recipes_touch before insert or update on public.recipes
  for each row execute function public.touch_row();
create trigger plan_entries_touch before insert or update on public.plan_entries
  for each row execute function public.touch_row();
create trigger state_items_touch before insert or update on public.state_items
  for each row execute function public.touch_row();

-- ---------------------------------------------------------------------------
-- Hjelpefunksjoner for tilgangskontroll
-- ---------------------------------------------------------------------------

create function public.is_household_member(hid uuid) returns boolean
language sql security definer stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.household_members m
    where m.household_id = hid and m.user_id = auth.uid()
  );
$$;

create function public.is_household_owner(hid uuid) returns boolean
language sql security definer stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.household_members m
    where m.household_id = hid and m.user_id = auth.uid() and m.role = 'owner'
  );
$$;

-- Første mappenavn i en lagringssti er husholdningens id. Null hvis stien er ugyldig.
create function public.path_household(p text) returns uuid
language plpgsql immutable
as $$
begin
  return split_part(p, '/', 1)::uuid;
exception when others then
  return null;
end;
$$;

-- ---------------------------------------------------------------------------
-- Radnivå-sikkerhet
-- ---------------------------------------------------------------------------

alter table public.households        enable row level security;
alter table public.household_members enable row level security;
alter table public.recipes           enable row level security;
alter table public.plan_entries      enable row level security;
alter table public.state_items       enable row level security;

revoke all on public.households, public.household_members,
              public.recipes, public.plan_entries, public.state_items from anon;
revoke all on public.households, public.household_members,
              public.recipes, public.plan_entries, public.state_items from authenticated;

-- Husholdninger og medlemskap endres kun via funksjonene under, bortsett fra navn og visningsnavn.
grant select on public.households to authenticated;
grant update (name) on public.households to authenticated;
grant select, delete on public.household_members to authenticated;
grant update (display_name) on public.household_members to authenticated;
grant select, insert, update on public.recipes, public.plan_entries, public.state_items to authenticated;

create policy households_select on public.households
  for select to authenticated using (public.is_household_member(id));
create policy households_update on public.households
  for update to authenticated
  using (public.is_household_owner(id)) with check (public.is_household_owner(id));

create policy members_select on public.household_members
  for select to authenticated using (public.is_household_member(household_id));
create policy members_update_self on public.household_members
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
-- Eier kan fjerne andre medlemmer. (Å forlate selv gjøres med leave_household.)
create policy members_delete_by_owner on public.household_members
  for delete to authenticated
  using (public.is_household_owner(household_id) and user_id <> auth.uid());

create policy recipes_all on public.recipes
  for all to authenticated
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));
create policy plan_entries_all on public.plan_entries
  for all to authenticated
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));
create policy state_items_all on public.state_items
  for all to authenticated
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

-- Rader slettes aldri direkte av klienter (de merkes deleted), så ingen delete-rettighet gis.

create index recipes_household_updated on public.recipes (household_id, updated_at);
create index plan_entries_household_updated on public.plan_entries (household_id, updated_at);
create index state_items_household_updated on public.state_items (household_id, updated_at);

-- ---------------------------------------------------------------------------
-- Funksjoner klienten kaller
-- ---------------------------------------------------------------------------

-- Forsøk på å gjette invitasjonskoder begrenses.
create table public.join_attempts (
  user_id uuid not null,
  at      timestamptz not null default now()
);
alter table public.join_attempts enable row level security;
revoke all on public.join_attempts from anon, authenticated;

create function public.new_invite_code() returns text
language plpgsql volatile
set search_path = public
as $$
declare
  code text;
begin
  loop
    -- 40 tilfeldige biter fra kryptografisk tilfeldig uuid.
    code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
    exit when not exists (select 1 from public.households where invite_code = code);
  end loop;
  return code;
end;
$$;
revoke execute on function public.new_invite_code() from public, anon, authenticated;

create function public.create_household(p_name text, p_display_name text default '')
returns uuid
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  uid uuid := auth.uid();
  hid uuid;
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  if exists (select 1 from public.household_members where user_id = uid) then
    raise exception 'already_member';
  end if;
  insert into public.households (name, invite_code, created_by)
    values (trim(p_name), public.new_invite_code(), uid)
    returning id into hid;
  insert into public.household_members (household_id, user_id, role, display_name)
    values (hid, uid, 'owner', coalesce(trim(p_display_name), ''));
  return hid;
end;
$$;

create function public.join_household(p_code text, p_display_name text default '')
returns uuid
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  uid uuid := auth.uid();
  hid uuid;
  norm text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  if exists (select 1 from public.household_members where user_id = uid) then
    raise exception 'already_member';
  end if;
  if (select count(*) from public.join_attempts
        where user_id = uid and at > now() - interval '1 hour') >= 10 then
    raise exception 'too_many_attempts';
  end if;
  insert into public.join_attempts (user_id) values (uid);

  select id into hid from public.households where invite_code = norm;
  -- Ugyldig kode gir null (ikke unntak), ellers ville loggføringen av forsøket blitt rullet tilbake.
  if hid is null then return null; end if;

  insert into public.household_members (household_id, user_id, role, display_name)
    values (hid, uid, 'member', coalesce(trim(p_display_name), ''));
  return hid;
end;
$$;

create function public.leave_household() returns void
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  uid uuid := auth.uid();
  hid uuid;
  was_owner boolean;
begin
  select household_id, role = 'owner' into hid, was_owner
    from public.household_members where user_id = uid;
  if hid is null then return; end if;

  delete from public.household_members where household_id = hid and user_id = uid;

  if not exists (select 1 from public.household_members where household_id = hid) then
    delete from public.households where id = hid;      -- siste medlem: slett alt
  elsif was_owner then
    update public.household_members set role = 'owner'  -- eldste medlem blir ny eier
      where (household_id, user_id) = (
        select household_id, user_id from public.household_members
        where household_id = hid order by joined_at limit 1);
  end if;
end;
$$;

create function public.regenerate_invite_code(p_household uuid) returns text
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  code text;
begin
  if not public.is_household_owner(p_household) then raise exception 'not_owner'; end if;
  code := public.new_invite_code();
  update public.households set invite_code = code where id = p_household;
  return code;
end;
$$;

-- Sletter brukerens konto og alle personlige data. Kreves av App Store (retningslinje 5.1.1(v)).
-- Forlater først husholdningen (siste medlem sletter den, ellers overtar eldste medlem som eier),
-- fjerner hvem-som-endret-markeringer, og sletter så selve innloggingen.
create function public.delete_my_account() returns void
language plpgsql security definer
set search_path = public, auth, pg_temp
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  perform public.leave_household();
  perform set_config('app.skip_touch', 'on', true);  -- gjelder kun denne transaksjonen
  update public.recipes set updated_by = null where updated_by = uid;
  update public.plan_entries set updated_by = null where updated_by = uid;
  update public.state_items set updated_by = null where updated_by = uid;
  delete from public.join_attempts where user_id = uid;
  delete from auth.users where id = uid;
end;
$$;

revoke execute on function public.create_household(text, text),
                          public.join_household(text, text),
                          public.leave_household(),
                          public.delete_my_account(),
                          public.regenerate_invite_code(uuid) from public, anon;
grant execute on function public.create_household(text, text),
                          public.join_household(text, text),
                          public.leave_household(),
                          public.delete_my_account(),
                          public.regenerate_invite_code(uuid) to authenticated;
grant execute on function public.is_household_member(uuid),
                          public.is_household_owner(uuid),
                          public.path_household(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Bilder (privat lagring, én mappe per husholdning)
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
  values ('recipe-images', 'recipe-images', false)
  on conflict (id) do nothing;

create policy recipe_images_select on storage.objects
  for select to authenticated
  using (bucket_id = 'recipe-images' and public.is_household_member(public.path_household(name)));
create policy recipe_images_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'recipe-images' and public.is_household_member(public.path_household(name)));
create policy recipe_images_update on storage.objects
  for update to authenticated
  using (bucket_id = 'recipe-images' and public.is_household_member(public.path_household(name)));
create policy recipe_images_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'recipe-images' and public.is_household_member(public.path_household(name)));

-- ---------------------------------------------------------------------------
-- Sanntid
-- ---------------------------------------------------------------------------

alter publication supabase_realtime add table
  public.recipes, public.plan_entries, public.state_items, public.household_members;
