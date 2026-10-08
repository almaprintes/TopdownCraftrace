-- Cloud save is private to the authenticated player, including anonymous sessions.
create table if not exists public.player_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  schema_version integer not null default 1 check (schema_version between 1 and 100),
  progress jsonb not null default '{}'::jsonb check (jsonb_typeof(progress) = 'object'),
  revision bigint not null default 1 check (revision > 0),
  updated_at timestamptz not null default now(),
  constraint player_progress_size check (octet_length(progress::text) <= 131072)
);
alter table public.player_progress enable row level security;
create policy player_progress_select_own on public.player_progress for select to authenticated using ((select auth.uid()) = user_id);
create policy player_progress_insert_own on public.player_progress for insert to authenticated with check ((select auth.uid()) = user_id);
create policy player_progress_update_own on public.player_progress for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
revoke all on public.player_progress from anon;
grant select, insert, update on public.player_progress to authenticated;
-- Revision check prevents a second device silently overwriting newer cloud data.
create or replace function public.save_my_player_progress(p_progress jsonb, p_expected_revision bigint default 0)
returns table(saved boolean, current_revision bigint)
language plpgsql security invoker set search_path = ''
as $$
declare v_user uuid := (select auth.uid()); v_revision bigint;
begin
 if v_user is null then raise exception 'Authentication required'; end if;
 if p_progress is null or jsonb_typeof(p_progress) <> 'object' or octet_length(p_progress::text) > 131072 then
   raise exception 'Invalid progress payload';
 end if;
 insert into public.player_progress(user_id,progress,revision,updated_at)
 values (v_user,p_progress,1,now())
 on conflict (user_id) do update set
 progress = excluded.progress, revision = player_progress.revision + 1, updated_at = now()
 where player_progress.revision = p_expected_revision
 returning revision into v_revision;
 if v_revision is null then
   select revision into v_revision from public.player_progress where user_id=v_user;
   return query select false, v_revision;
 else
   return query select true, v_revision;
 end if;
end $$;
revoke all on function public.save_my_player_progress(jsonb,bigint) from public,anon;
grant execute on function public.save_my_player_progress(jsonb,bigint) to authenticated;