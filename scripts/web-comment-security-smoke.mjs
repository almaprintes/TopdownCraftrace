import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const sql=readFileSync('supabase/migrations/20261030_030_web_comment_server_limits.sql','utf8');
assert.match(sql,/security definer/i,'Keep the validated RPC boundary for anonymous web users');
assert.match(sql,/set search_path to ''/i,'Prevent arbitrary schema resolution in a privileged function');
assert.match(sql,/pg_try_advisory_xact_lock\(6183, 20261030\)/,
  'Concurrent anonymous requests must not bypass the global submission limit');
assert.match(sql,/from public\.web_track_comments\s+where track_id=p_track_id and created_at>now\(\)-interval '1 hour'\s+order by created_at desc offset 11 limit 1/,
  '12 posts/hour/track checked using existing (track_id,created_at) index');
assert.match(sql,/from public\.web_track_comments\s+where track_id=p_track_id and created_at>now\(\)-interval '1 day'\s+order by created_at desc offset 59 limit 1/,
  '60 posts/day/track checked with bounded index reads');
assert.match(sql,/last_posted_at into v_last/,'Keep existing client-token cooldown');
assert.match(sql,/v_last > now\(\)-interval '60 seconds'/,'Keep 60-second cooldown');
assert.match(sql,/invalid_track|invalid_name|invalid_message|reserved_name/,
  'Keep caller field validation and reserved names');
assert.ok(sql.indexOf('offset 59 limit 1')<sql.indexOf('insert into public.web_comment_rate_limits'),
  'Never create junk client tokens for requests already rejected by global limits');
assert.ok(sql.indexOf('insert into public.web_comment_rate_limits')<sql.indexOf('insert into public.web_track_comments'),
  'Keep token cooldown and public comment publication within a single transaction');
assert.match(sql,/revoke all on function public\.post_web_track_comment\(text,text,text,uuid\) from public,anon,authenticated/,
  'Remove default PUBLIC execute permissions');
assert.match(sql,/grant execute on function public\.post_web_track_comment\(text,text,text,uuid\) to anon,authenticated/,
  'Keep website posting compatible with unauthenticated visitors');
assert.match(sql,/where jobname='tdr-web-rankings-cleanup' and active/,
  'Reuse the existing cleanup job rather than adding another scheduled task');
assert.match(sql,/last_posted_at < now\(\)-interval ''48 hours''/,
  'Bound disposable UUID token growth to 48 hours');
assert.doesNotMatch(sql,/create index|create table|cron\.schedule|delete from public\.web_track_comments|drop table|alter table public\.track_records/i,
  'No extra indices, scheduled tasks, deletion of comments or player-data changes');
console.log('PASS: web comments retain anonymous posting; bounded server-side limits, serialized checks, 48h token cleanup');
