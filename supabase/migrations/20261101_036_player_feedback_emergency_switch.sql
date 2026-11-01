-- TDR: voluntary feedback, remotely controlled with a server-side hard stop.
-- Disabled by default. No legacy gameplay table, advertisements or records are altered.
create table if not exists public.tdr_feedback_control (
  id text primary key default 'global' check (id = 'global'),
  enabled boolean not null default false,
  daily_global_limit integer not null default 40 check (daily_global_limit between 1 and 200),
  daily_user_limit integer not null default 2 check (daily_user_limit between 1 and 5),
  updated_at timestamptz not null default now(),
  updated_by uuid
);
insert into public.tdr_feedback_control(id,enabled) values ('global',false)
on conflict(id) do nothing;

create table if not exists public.tdr_feedback_reports (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('performance','controls','track','online','other')),
  message text not null check (char_length(message) between 8 and 1000),
  diagnostics jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists tdr_feedback_reports_created_at_idx on public.tdr_feedback_reports(created_at desc);
create index if not exists tdr_feedback_reports_user_recent_idx on public.tdr_feedback_reports(user_id,created_at desc);

alter table public.tdr_feedback_control enable row level security;
alter table public.tdr_feedback_reports enable row level security;

revoke all on public.tdr_feedback_control from anon, authenticated;
revoke all on public.tdr_feedback_reports from anon, authenticated;
grant select on public.tdr_feedback_control to anon, authenticated;
grant select on public.tdr_feedback_reports to authenticated;

create policy tdr_feedback_control_read on public.tdr_feedback_control
  for select to anon,authenticated using (true);
create policy tdr_feedback_reports_staff_read on public.tdr_feedback_reports
  for select to authenticated using (
    coalesce((select auth.jwt())->'app_metadata'->>'tdr_staff','false') = 'true'
  );

-- One database transaction serializes global and per-user limit checks.
-- No client is granted INSERT/UPDATE/DELETE on either table.
create or replace function public.tdr_submit_feedback(
  p_category text, p_message text, p_diagnostics jsonb default '{}'::jsonb
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_control public.tdr_feedback_control%rowtype;
  v_today timestamptz := date_trunc('day',now() at time zone 'UTC') at time zone 'UTC';
  v_last timestamptz;
  v_global integer;
  v_user integer;
  v_id bigint;
begin
  if v_uid is null then return jsonb_build_object('accepted',false,'reason','auth_required'); end if;
  if coalesce(p_category,'') not in ('performance','controls','track','online','other')
     or length(btrim(coalesce(p_message,''))) not between 8 and 1000
     or coalesce(jsonb_typeof(p_diagnostics),'null') <> 'object'
     or length(p_diagnostics::text) > 1500
  then return jsonb_build_object('accepted',false,'reason','invalid'); end if;

  -- Locked check, not a client-controlled cached preference.
  perform pg_catalog.pg_advisory_xact_lock(27101,20261101);
  select * into v_control from public.tdr_feedback_control where id='global';
  if not found or not v_control.enabled then
    return jsonb_build_object('accepted',false,'reason','disabled');
  end if;
  select count(*) into v_global from public.tdr_feedback_reports where created_at >= v_today;
  if v_global >= v_control.daily_global_limit then
    return jsonb_build_object('accepted',false,'reason','daily_limit');
  end if;
  select count(*),max(created_at) into v_user,v_last
  from public.tdr_feedback_reports where user_id=v_uid and created_at >= v_today;
  if v_user >= v_control.daily_user_limit then
    return jsonb_build_object('accepted',false,'reason','user_limit');
  end if;
  if v_last is not null and v_last > now()-interval '5 minutes' then
    return jsonb_build_object('accepted',false,'reason','cooldown');
  end if;

  insert into public.tdr_feedback_reports(user_id,category,message,diagnostics)
  values(v_uid,p_category,btrim(p_message),p_diagnostics)
  returning id into v_id;
  -- Retention: remove old feedback on successful submissions.
  delete from public.tdr_feedback_reports where created_at < now()-interval '30 days';
  return jsonb_build_object('accepted',true,'id',v_id);
end $$;

create or replace function public.tdr_feedback_admin_status() returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare v_enabled boolean; v_limit integer; v_count integer;
begin
  if auth.uid() is null or coalesce((select auth.jwt())->'app_metadata'->>'tdr_staff','false') <> 'true'
  then raise exception 'forbidden' using errcode='42501'; end if;
  select enabled,daily_global_limit into v_enabled,v_limit
  from public.tdr_feedback_control where id='global';
  select count(*) into v_count from public.tdr_feedback_reports
  where created_at >= (date_trunc('day',now() at time zone 'UTC') at time zone 'UTC');
  return jsonb_build_object('enabled',v_enabled,'daily_limit',v_limit,'received_today',v_count);
end $$;

create or replace function public.tdr_set_feedback_enabled(p_enabled boolean) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare v_enabled boolean;
begin
  if auth.uid() is null or coalesce((select auth.jwt())->'app_metadata'->>'tdr_staff','false') <> 'true'
  then raise exception 'forbidden' using errcode='42501'; end if;
  if p_enabled is null then raise exception 'invalid state' using errcode='22023'; end if;
  perform pg_catalog.pg_advisory_xact_lock(27101,20261101);
  update public.tdr_feedback_control
  set enabled=p_enabled,updated_at=now(),updated_by=auth.uid()
  where id='global' returning enabled into v_enabled;
  if not found then raise exception 'missing control'; end if;
  return jsonb_build_object('enabled',v_enabled);
end $$;

revoke all on function public.tdr_submit_feedback(text,text,jsonb) from public,anon;
revoke all on function public.tdr_feedback_admin_status() from public,anon;
revoke all on function public.tdr_set_feedback_enabled(boolean) from public,anon;
grant execute on function public.tdr_submit_feedback(text,text,jsonb) to authenticated;
grant execute on function public.tdr_feedback_admin_status() to authenticated;
grant execute on function public.tdr_set_feedback_enabled(boolean) to authenticated;
