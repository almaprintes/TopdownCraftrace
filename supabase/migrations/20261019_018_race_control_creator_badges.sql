-- DEV 1.2.297: the creator badge in online record rows is derived from
-- record.user_id -> authenticated pilot profile -> reserved creator name.
-- Do not trust a client's nickname, rank, or local creator flag.
-- One inexpensive read for the circuit, never one request per player.
create or replace function public.get_track_creator_badges(p_track_id text)
returns table (record_ref uuid, nick text, badge text)
language sql stable security definer set search_path = ''
as $$
 select tr.record_ref,p.nick,res.badge
 from public.track_records tr
 join public.profiles p on p.user_id=tr.user_id
 join public.web_reserved_comment_names res
   on res.normalized_name=pg_catalog.upper(pg_catalog.regexp_replace(p.nick,'[^A-Za-z0-9]','','g'))
   and res.display_name collate "C"=p.nick collate "C"
 where auth.uid() is not null
   and p_track_id is not null
   and pg_catalog.char_length(p_track_id) between 1 and 80
   and tr.track_id=pg_catalog.btrim(p_track_id)
   and res.badge='CREADOR'
 order by tr.record_ref limit 500
$$;
revoke all on function public.get_track_creator_badges(text) from public, anon, authenticated;
grant execute on function public.get_track_creator_badges(text) to authenticated;
