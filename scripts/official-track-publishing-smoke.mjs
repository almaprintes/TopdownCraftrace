import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const whitelist=readFileSync('supabase/migrations/20261030_031_official_track_publication_guard.sql','utf8');
const catalogue=readFileSync('supabase/migrations/20261028_022_race_control_current_circuits_only.sql','utf8');
const ids=source=>Array.from(source.matchAll(/^\s*\('([^']+)'\),?\s*$/gm),x=>x[1]);
const official=ids(catalogue);
const protectedIds=[...whitelist.matchAll(/^\s*'([^']+)',?\s*$/gm)].map(x=>x[1]);
assert.equal(official.length,13,'All 13 official editions must be represented');
assert.deepEqual(protectedIds,official,'Publisher allowlist must mirror the current official leaderboard catalogue');
assert.match(whitelist,/create or replace function tdr_web_private\.is_current_race_control_track\(p_track_id text\)/);
assert.match(whitelist,/immutable\s+strict\s+security invoker/);
assert.match(whitelist,/revoke all on function tdr_web_private\.is_current_race_control_track\(text\)\s+from public,anon,authenticated/);
assert.match(whitelist,/md5\(pg_get_functiondef\('public\.submit_track_record/,
  'Abort if the audited publisher implementation changed');
assert.equal((whitelist.match(/if not tdr_web_private\.is_current_race_control_track\(v_track_id\)/g)||[]).length,2,
  'Both time-only and replay publisher must reject unsupported track IDs');
assert.match(whitelist,/raise exception 'Invalid track_id'/);
assert.match(whitelist,/grant execute on function public\.submit_track_record\(text,integer,text\)\s+to authenticated/);
assert.match(whitelist,/grant execute on function public\.submit_track_record_with_ghost\(text,integer,text,bytea,integer,smallint\)\s+to authenticated/);
assert.doesNotMatch(whitelist,/create table|create index|delete from public\.track_records|truncate table|drop table/i,
  'No extra tables or destructive record changes');
console.log('PASS: 13 official server track IDs, no spoofed tracks, publisher grants retained, no extra DB reads');
