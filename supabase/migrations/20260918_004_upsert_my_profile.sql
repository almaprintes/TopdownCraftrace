-- TopDown RACE: Craftrace
-- RACE Control Online
-- Phase 4: secure online profile upsert.

create or replace function public.upsert_my_profile(
  p_nick text,
  p_continent_code text,
  p_country_code text,
  p_region_code text
)
returns table (
  user_id uuid,
  nick text,
  continent_code text,
  country_code text,
  region_code text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_nick text;
  v_continent text;
  v_country text;
  v_region text;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  v_nick := trim(p_nick);
  v_continent := upper(trim(p_continent_code));
  v_country := upper(trim(p_country_code));
  v_region := upper(trim(p_region_code));

  if v_nick is null
     or char_length(v_nick) < 3
     or char_length(v_nick) > 16 then
    raise exception 'Invalid nick';
  end if;

  if v_continent is null
     or v_continent !~ '^[A-Z]{2}$' then
    raise exception 'Invalid continent_code';
  end if;

  if v_country is null
     or v_country !~ '^[A-Z]{2}$' then
    raise exception 'Invalid country_code';
  end if;

  if v_region is null
     or char_length(v_region) < 2
     or char_length(v_region) > 12 then
    raise exception 'Invalid region_code';
  end if;

  insert into public.profiles (
    user_id,
    nick,
    continent_code,
    country_code,
    region_code
  )
  values (
    v_user_id,
    v_nick,
    v_continent,
    v_country,
    v_region
  )
  on conflict (user_id)
  do update set
    nick = excluded.nick,
    continent_code = excluded.continent_code,
    country_code = excluded.country_code,
    region_code = excluded.region_code,
    updated_at = now();

  return query
  select
    p.user_id,
    p.nick,
    p.continent_code,
    p.country_code,
    p.region_code,
    p.created_at,
    p.updated_at
  from public.profiles p
  where p.user_id = v_user_id;
end;
$$;

revoke all on function public.upsert_my_profile(text, text, text, text)
from public;

revoke all on function public.upsert_my_profile(text, text, text, text)
from anon;

grant execute on function public.upsert_my_profile(text, text, text, text)
to authenticated;
