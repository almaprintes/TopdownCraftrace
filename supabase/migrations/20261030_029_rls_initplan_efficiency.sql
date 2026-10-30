-- Optimize all ten RLS initplan warnings without altering authorization.
-- Protect existing definitions: abort atomically on unexpected policy drift.
-- Roles, commands, JWT app_metadata staff checks and user ownership unchanged.
begin;
do $rls_precondition$
declare matched integer;
begin
  with expected (tablename,policyname,cmd,roles,qual,with_check) as (
    values
    ('profiles', 'profiles_insert_own', 'INSERT', '{authenticated}', NULL, '(user_id = auth.uid())'),
    ('profiles', 'profiles_select_own', 'SELECT', '{authenticated}', '(user_id = auth.uid())', NULL),
    ('profiles', 'profiles_update_own', 'UPDATE', '{authenticated}', '(user_id = auth.uid())', '(user_id = auth.uid())'),
    ('tdr_public_notices', 'tdr_notices_public_read', 'SELECT', '{anon,authenticated}', '(((active = true) AND (starts_at <= now()) AND ((ends_at IS NULL) OR (ends_at > now()))) OR (COALESCE(((auth.jwt() -> ''app_metadata''::text) ->> ''tdr_staff''::text), ''false''::text) = ''true''::text))', NULL),
    ('tdr_public_notices', 'tdr_notices_staff_delete', 'DELETE', '{authenticated}', '(COALESCE(((auth.jwt() -> ''app_metadata''::text) ->> ''tdr_staff''::text), ''false''::text) = ''true''::text)', NULL),
    ('tdr_public_notices', 'tdr_notices_staff_insert', 'INSERT', '{authenticated}', NULL, '(COALESCE(((auth.jwt() -> ''app_metadata''::text) ->> ''tdr_staff''::text), ''false''::text) = ''true''::text)'),
    ('tdr_public_notices', 'tdr_notices_staff_update', 'UPDATE', '{authenticated}', '(COALESCE(((auth.jwt() -> ''app_metadata''::text) ->> ''tdr_staff''::text), ''false''::text) = ''true''::text)', '(COALESCE(((auth.jwt() -> ''app_metadata''::text) ->> ''tdr_staff''::text), ''false''::text) = ''true''::text)'),
    ('track_records', 'track_records_insert_own', 'INSERT', '{authenticated}', NULL, '(user_id = auth.uid())'),
    ('track_records', 'track_records_select_own', 'SELECT', '{authenticated}', '(user_id = auth.uid())', NULL),
    ('track_records', 'track_records_update_own', 'UPDATE', '{authenticated}', '(user_id = auth.uid())', '(user_id = auth.uid())')
  )
  select count(*) into matched
  from expected e join pg_policies p
    on p.schemaname='public'
   and p.tablename=e.tablename
   and p.policyname=e.policyname
   and p.cmd=e.cmd
   and p.roles::text=e.roles
   and p.permissive='PERMISSIVE'
   and p.qual is not distinct from e.qual
   and p.with_check is not distinct from e.with_check;
  if matched<>10 then
    raise exception 'RLS guard: existing policy definition changed. Expected 10 exact matches, got %',matched;
  end if;
end;
$rls_precondition$;

alter policy "profiles_insert_own" on public."profiles"
  with check ((user_id = (select auth.uid())));

alter policy "profiles_select_own" on public."profiles"
  using ((user_id = (select auth.uid())));

alter policy "profiles_update_own" on public."profiles"
  using ((user_id = (select auth.uid())))
  with check ((user_id = (select auth.uid())));

alter policy "tdr_notices_public_read" on public."tdr_public_notices"
  using ((((active = true) AND (starts_at <= now()) AND ((ends_at IS NULL) OR (ends_at > now()))) OR (COALESCE((((select auth.jwt()) -> 'app_metadata'::text) ->> 'tdr_staff'::text), 'false'::text) = 'true'::text)));

alter policy "tdr_notices_staff_delete" on public."tdr_public_notices"
  using ((COALESCE((((select auth.jwt()) -> 'app_metadata'::text) ->> 'tdr_staff'::text), 'false'::text) = 'true'::text));

alter policy "tdr_notices_staff_insert" on public."tdr_public_notices"
  with check ((COALESCE((((select auth.jwt()) -> 'app_metadata'::text) ->> 'tdr_staff'::text), 'false'::text) = 'true'::text));

alter policy "tdr_notices_staff_update" on public."tdr_public_notices"
  using ((COALESCE((((select auth.jwt()) -> 'app_metadata'::text) ->> 'tdr_staff'::text), 'false'::text) = 'true'::text))
  with check ((COALESCE((((select auth.jwt()) -> 'app_metadata'::text) ->> 'tdr_staff'::text), 'false'::text) = 'true'::text));

alter policy "track_records_insert_own" on public."track_records"
  with check ((user_id = (select auth.uid())));

alter policy "track_records_select_own" on public."track_records"
  using ((user_id = (select auth.uid())));

alter policy "track_records_update_own" on public."track_records"
  using ((user_id = (select auth.uid())))
  with check ((user_id = (select auth.uid())));

commit;
