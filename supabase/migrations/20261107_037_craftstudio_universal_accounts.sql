-- CraftRace Studio: one Supabase Auth UUID for every game, local progress isolated.
-- Applied in Supabase on 2026-11-07 (initial tables + universal membership).
-- Replay-safe for future environments. Never changes TDR legacy profiles.
create schema if not exists slotrace_internal;
revoke all on schema slotrace_internal from public, anon, authenticated;

create table if not exists public.craft_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nickname text check (nickname ~ '^[A-Za-z0-9_-]{3,24}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- On an older staged schema, ensure the Studio record can exist before alias selection.
alter table public.craft_accounts alter column nickname drop not null;
create unique index if not exists craft_accounts_nickname_unique_ci
  on public.craft_accounts (lower(nickname));
comment on table public.craft_accounts is
  'Shared permanent identity for all CraftRace Studio games, sourced only from auth.users.id';
comment on column public.craft_accounts.nickname is
  'Unique public alias; NULL until the permanent identity chooses a name.';

create or replace function slotrace_internal.check_craft_nickname()
returns trigger language plpgsql security definer set search_path=''
as $fn$
begin
  if exists(
    select 1 from public.profiles p
    where lower(btrim(p.nick))=lower(btrim(new.nickname))
      and p.user_id <> new.user_id
  ) then
    raise unique_violation using message='Ese apodo ya pertenece a otro piloto de CraftRace.';
  end if;
  new.updated_at=now();
  return new;
end
$fn$;
revoke all on function slotrace_internal.check_craft_nickname()
  from public, anon, authenticated;
drop trigger if exists craft_accounts_nickname_guard on public.craft_accounts;
create trigger craft_accounts_nickname_guard
  before insert or update of nickname on public.craft_accounts
  for each row execute function slotrace_internal.check_craft_nickname();

alter table public.craft_accounts enable row level security;
drop policy if exists craft_accounts_select_own on public.craft_accounts;
create policy craft_accounts_select_own on public.craft_accounts
  for select to authenticated
  using (user_id=(select auth.uid())
    and coalesce((auth.jwt()->>'is_anonymous')::boolean,false)=false);
drop policy if exists craft_accounts_insert_own on public.craft_accounts;
create policy craft_accounts_insert_own on public.craft_accounts
  for insert to authenticated
  with check (user_id=(select auth.uid())
    and coalesce((auth.jwt()->>'is_anonymous')::boolean,false)=false);
drop policy if exists craft_accounts_update_own on public.craft_accounts;
create policy craft_accounts_update_own on public.craft_accounts
  for update to authenticated
  using (user_id=(select auth.uid())
    and coalesce((auth.jwt()->>'is_anonymous')::boolean,false)=false)
  with check (user_id=(select auth.uid())
    and coalesce((auth.jwt()->>'is_anonymous')::boolean,false)=false);
revoke all on public.craft_accounts from anon, authenticated;
grant select, insert, update on public.craft_accounts to authenticated;

create table if not exists public.slotrace_profiles (
  user_id uuid primary key references public.craft_accounts(user_id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.slotrace_profiles enable row level security;
drop policy if exists slotrace_profiles_select_own on public.slotrace_profiles;
create policy slotrace_profiles_select_own on public.slotrace_profiles
  for select to authenticated
  using (user_id=(select auth.uid())
    and coalesce((auth.jwt()->>'is_anonymous')::boolean,false)=false);
drop policy if exists slotrace_profiles_insert_own on public.slotrace_profiles;
create policy slotrace_profiles_insert_own on public.slotrace_profiles
  for insert to authenticated
  with check (user_id=(select auth.uid())
    and coalesce((auth.jwt()->>'is_anonymous')::boolean,false)=false);
drop policy if exists slotrace_profiles_update_own on public.slotrace_profiles;
create policy slotrace_profiles_update_own on public.slotrace_profiles
  for update to authenticated
  using (user_id=(select auth.uid())
    and coalesce((auth.jwt()->>'is_anonymous')::boolean,false)=false)
  with check (user_id=(select auth.uid())
    and coalesce((auth.jwt()->>'is_anonymous')::boolean,false)=false);
revoke all on public.slotrace_profiles from anon, authenticated;
grant select, insert, update on public.slotrace_profiles to authenticated;

-- An anonymous TDR guest only becomes Studio member after verification/link.
-- Never reassign UUIDs or migrate game progress as a side effect of Auth.
create or replace function slotrace_internal.register_craftstudio_auth_user()
returns trigger language plpgsql security definer set search_path=''
as $fn$
begin
  if new.is_anonymous is false then
    insert into public.craft_accounts (user_id,nickname)
    values (new.id,null) on conflict (user_id) do nothing;
  end if;
  return new;
end
$fn$;
revoke all on function slotrace_internal.register_craftstudio_auth_user()
  from public, anon, authenticated;
drop trigger if exists craftstudio_register_permanent_auth_user on auth.users;
create trigger craftstudio_register_permanent_auth_user
  after insert or update of is_anonymous on auth.users
  for each row when (new.is_anonymous is false)
  execute function slotrace_internal.register_craftstudio_auth_user();

-- Existing permanent identities keep their original Supabase user UUID.
insert into public.craft_accounts(user_id,nickname)
  select id,null from auth.users where is_anonymous is false
  on conflict (user_id) do nothing;
