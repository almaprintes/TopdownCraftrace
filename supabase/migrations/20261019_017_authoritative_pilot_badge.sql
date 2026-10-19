-- DEV 1.2.295: an authenticated UUID owns the creator badge, never
-- an unverified nickname editable on the client.
create or replace function public.get_my_pilot_badge()
returns text language sql stable security definer set search_path = ''
as $$
  select r.badge
  from public.profiles p
  join public.web_reserved_comment_names r
    on r.normalized_name = pg_catalog.upper(
      pg_catalog.regexp_replace(p.nick,'[^A-Za-z0-9]','','g'))
    and r.display_name collate "C" = p.nick collate "C"
  where p.user_id = auth.uid()
    and r.badge = 'CREADOR'
  limit 1
$$;
revoke all on function public.get_my_pilot_badge() from public, anon, authenticated;
grant execute on function public.get_my_pilot_badge() to authenticated;
