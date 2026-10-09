-- Keep the relational schema marker in sync with our portable JSON format.
-- Adds no tables; modifies no existing user rows.
alter table public.player_progress alter column schema_version set default 2;

create or replace function public.save_my_player_progress(
  p_progress jsonb, p_expected_revision bigint default 0
)
returns table(saved boolean, current_revision bigint)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_revision bigint;
  v_format integer;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if p_expected_revision is null or p_expected_revision < 0 then
    raise exception 'Invalid revision';
  end if;
  if p_progress is null or jsonb_typeof(p_progress) <> 'object'
    or octet_length(p_progress::text) > 524288
    or (p_progress->>'format') not in ('1','2')
    or jsonb_typeof(p_progress->'data') <> 'object'
  then raise exception 'Invalid progress payload'; end if;
  v_format:=(p_progress->>'format')::integer;

  insert into public.player_progress (user_id,schema_version,progress,revision,updated_at)
  values (v_user,v_format,p_progress,1,now())
  on conflict (user_id) do update set
    schema_version=excluded.schema_version,
    progress=excluded.progress,
    revision=player_progress.revision+1,
    updated_at=now()
  where player_progress.revision=p_expected_revision
  returning revision into v_revision;

  if v_revision is null then
    select revision into v_revision from public.player_progress where user_id=v_user;
    return query select false,v_revision;
  else
    return query select true,v_revision;
  end if;
end $$;
revoke all on function public.save_my_player_progress(jsonb,bigint) from public,anon;
grant execute on function public.save_my_player_progress(jsonb,bigint) to authenticated;
