-- Non-destructive cloud progress write coalescing (30 Oct 2026).
-- Identical format+data, even if createdAt differs, must NOT rewrite JSONB,
-- increment revision, or produce WAL / index changes. Keep existing RPC schema,
-- authorized owner UUID, CAS revision guarantees and format 1/2 compatibility.
-- No changes to existing rows, additional tables, indices or cron jobs.
begin;
do $guard$
begin
  if md5(pg_get_functiondef('public.save_my_player_progress(jsonb,bigint)'::regprocedure)) <> 'e7cbfd2d597bde2b7b841616de27cfd8'
  then raise exception 'Cloud save function changed since audit, refusing replacement'; end if;
end;
$guard$;
CREATE OR REPLACE FUNCTION public.save_my_player_progress(p_progress jsonb, p_expected_revision bigint DEFAULT 0)
 RETURNS TABLE(saved boolean, current_revision bigint)
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_user uuid := (select auth.uid());
  v_revision bigint;
  v_format integer;
  v_unchanged boolean;
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
    and (player_progress.schema_version is distinct from excluded.schema_version
      or player_progress.progress->'data' is distinct from excluded.progress->'data')
  returning revision into v_revision;

  if v_revision is null then
    -- One indexed fallback read ONLY when a conflict/no-op prevented a write.
    -- If revision matches and logical data/format are identical, acknowledge
    -- success without rewriting the JSONB row (ignore fresh createdAt).
    select p.revision,
           (p.revision=p_expected_revision and p.schema_version=v_format
            and p.progress->'data' = p_progress->'data')
    into v_revision,v_unchanged
    from public.player_progress p where p.user_id=v_user;
    return query select coalesce(v_unchanged,false),coalesce(v_revision,0);
  else
    return query select true,v_revision;
  end if;
end $function$
;
revoke all on function public.save_my_player_progress(jsonb,bigint) from public,anon;
grant execute on function public.save_my_player_progress(jsonb,bigint) to authenticated;
commit;
