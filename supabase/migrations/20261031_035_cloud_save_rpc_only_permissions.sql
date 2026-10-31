-- TDR 035, applied to production 2026-10-31.
-- Close bypass of cloud-save revision/CAS/size/format via direct table DML.
-- No changes to players, saves, records, RLS or schema. Idempotent guard.
begin;
do $guard$
declare v_function oid := 'public.save_my_player_progress(jsonb,bigint)'::regprocedure;
begin
  if md5(pg_get_functiondef(v_function)) <> 'cb23a013a88543bc981c7a9ba3926858'
     or (select prosecdef from pg_proc where oid=v_function)
     or not has_function_privilege('authenticated',v_function,'EXECUTE')
  then raise exception 'Unexpected cloud-save RPC version or privilege; no change applied'; end if;
  if not has_table_privilege('authenticated','public.player_progress','SELECT')
    then raise exception 'Cloud restore SELECT permission missing'; end if;
end;
$guard$;
-- Existing RPC already requires auth.uid, checks format/size/revision,
-- uses fully qualified identifiers and an empty search_path.
alter function public.save_my_player_progress(jsonb,bigint) security definer;
revoke insert,update,delete on table public.player_progress from public,anon,authenticated;
revoke all on function public.save_my_player_progress(jsonb,bigint) from public,anon;
grant execute on function public.save_my_player_progress(jsonb,bigint) to authenticated;
do $verify$
begin
  if has_table_privilege('authenticated','public.player_progress','INSERT')
     or has_table_privilege('authenticated','public.player_progress','UPDATE')
     or has_table_privilege('authenticated','public.player_progress','DELETE')
     or not has_table_privilege('authenticated','public.player_progress','SELECT')
     or has_function_privilege('anon','public.save_my_player_progress(jsonb,bigint)','EXECUTE')
     or not has_function_privilege('authenticated','public.save_my_player_progress(jsonb,bigint)','EXECUTE')
     or not (select prosecdef from pg_proc
              where oid='public.save_my_player_progress(jsonb,bigint)'::regprocedure)
  then raise exception 'Cloud-save DML boundary failed verification'; end if;
end;
$verify$;
commit;