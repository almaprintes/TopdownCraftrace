-- TDR November 2026 Black Friday: read-only promotion switch for game clients.
-- Requires no player-auth state, preserves rankings/garage data.
create table if not exists public.tdr_promotion_control (
  id text primary key check (id = 'november_2026'),
  enabled boolean not null default true,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  updated_at timestamptz not null default now(),
  constraint tdr_promo_valid_window check (ends_at > starts_at)
);
alter table public.tdr_promotion_control enable row level security;
revoke all on table public.tdr_promotion_control from public, anon, authenticated;
grant select on table public.tdr_promotion_control to anon, authenticated;
drop policy if exists "tdr_promotion_read_only" on public.tdr_promotion_control;
create policy "tdr_promotion_read_only" on public.tdr_promotion_control
  for select to anon, authenticated using (true);
insert into public.tdr_promotion_control(id, enabled, starts_at, ends_at)
values ('november_2026', true, '2026-10-27T21:00:00Z', '2026-12-01T00:00:00Z')
on conflict (id) do nothing;
-- Turn on/off without a new app release:
-- update public.tdr_promotion_control set enabled=false, updated_at=now()
--   where id='november_2026';
