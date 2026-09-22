-- TopDown RACE: Craftrace
-- Shipaton 2026: server-authorized, temporary evaluation access.

create schema if not exists private;
revoke all on schema private from public;
revoke all on schema private from anon;
revoke all on schema private from authenticated;

create table if not exists private.shipaton_judge_codes (
  id uuid primary key default extensions.gen_random_uuid(),
  code_hash text not null unique check (char_length(code_hash)=64),
  label text not null default 'Shipaton 2026 judges',
  active boolean not null default true,
  expires_at timestamptz not null,
  max_activations integer not null check (max_activations between 1 and 100),
  activation_count integer not null default 0 check (activation_count>=0),
  created_at timestamptz not null default now()
);

create table if not exists private.shipaton_judge_entitlements (
  user_id uuid primary key references auth.users(id) on delete cascade,
  code_id uuid not null references private.shipaton_judge_codes(id) on delete restrict,
  activated_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz
);

alter table private.shipaton_judge_codes enable row level security;
alter table private.shipaton_judge_entitlements enable row level security;
revoke all on table private.shipaton_judge_codes from public,anon,authenticated;
revoke all on table private.shipaton_judge_entitlements from public,anon,authenticated;

create or replace function public.get_my_shipaton_judge_access()
returns table (enabled boolean, expires_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  return query
  select
    coalesce(e.revoked_at is null and e.expires_at>now(),false),
    case when e.revoked_at is null and e.expires_at>now() then e.expires_at else null end
  from (select 1) seed
  left join private.shipaton_judge_entitlements e on e.user_id=v_user_id;
end;
$$;

create or replace function public.activate_shipaton_judge_access(p_code text)
returns table (enabled boolean, expires_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_code private.shipaton_judge_codes%rowtype;
  v_existing private.shipaton_judge_entitlements%rowtype;
  v_normalized text := upper(trim(coalesce(p_code,'')));
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if char_length(v_normalized) not between 12 and 80 then raise exception 'Invalid judge code'; end if;

  select * into v_existing
  from private.shipaton_judge_entitlements e
  where e.user_id=v_user_id;

  if found and v_existing.revoked_at is null and v_existing.expires_at>now() then
    return query select true,v_existing.expires_at;
    return;
  end if;

  select * into v_code
  from private.shipaton_judge_codes c
  where c.code_hash=encode(extensions.digest(v_normalized,'sha256'),'hex')
  for update;

  if not found or not v_code.active or v_code.expires_at<=now() then
    raise exception 'Invalid or expired judge code';
  end if;
  if v_code.activation_count>=v_code.max_activations then
    raise exception 'Judge code activation limit reached';
  end if;

  insert into private.shipaton_judge_entitlements(user_id,code_id,activated_at,expires_at,revoked_at)
  values(v_user_id,v_code.id,now(),v_code.expires_at,null)
  on conflict(user_id) do update set
    code_id=excluded.code_id,
    activated_at=excluded.activated_at,
    expires_at=excluded.expires_at,
    revoked_at=null;

  update private.shipaton_judge_codes
  set activation_count=activation_count+1
  where id=v_code.id;

  return query select true,v_code.expires_at;
end;
$$;

revoke all on function public.get_my_shipaton_judge_access() from public;
revoke all on function public.get_my_shipaton_judge_access() from anon;
grant execute on function public.get_my_shipaton_judge_access() to authenticated;
revoke all on function public.activate_shipaton_judge_access(text) from public;
revoke all on function public.activate_shipaton_judge_access(text) from anon;
grant execute on function public.activate_shipaton_judge_access(text) to authenticated;
