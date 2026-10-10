-- TDR DEV 1.2.97: new claims are exact-case unique. Historic duplicate
-- CaMByMaN accounts are grandfathered until the owner reconciles devices.
-- Existing rows are not renamed or deleted by this migration.
create or replace function public.enforce_unique_pilot_nick()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.nick is not distinct from old.nick then
    return new;
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.nick, 0));
  if exists (select 1 from public.profiles p
             where p.user_id <> new.user_id
               and p.nick collate "C" = new.nick collate "C") then
    raise exception using errcode = '23505',
      message = 'Ese nombre de piloto ya está ocupado. Elige otro.';
  end if;
  return new;
end
$$;

drop trigger if exists profiles_unique_nick_guard on public.profiles;
create trigger profiles_unique_nick_guard
before insert or update of nick on public.profiles
for each row execute function public.enforce_unique_pilot_nick();

create or replace function public.claim_my_pilot_nick(p_nick text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_nick text;
begin
  v_id := auth.uid();
  if v_id is null then
    raise exception using errcode='28000', message='Necesitas conexión para reservar tu nick.';
  end if;
  v_nick := pg_catalog.btrim(pg_catalog.regexp_replace(coalesce(p_nick,''),'[[:space:]]+',' ','g'));
  if char_length(v_nick) < 3 or char_length(v_nick) > 16 then
    raise exception using errcode='22023', message='El nombre debe tener entre 3 y 16 caracteres.';
  end if;
  insert into public.profiles (user_id,nick,continent_code,country_code,region_code)
  values (v_id,v_nick,'XX','XX','XX')
  on conflict (user_id) do update set nick=excluded.nick,updated_at=now();
  return v_nick;
end
$$;
revoke all on function public.claim_my_pilot_nick(text) from public, anon;
grant execute on function public.claim_my_pilot_nick(text) to authenticated;
revoke all on function public.enforce_unique_pilot_nick() from public, anon, authenticated;
