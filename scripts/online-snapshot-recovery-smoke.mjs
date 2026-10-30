import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {needsRaceControlCacheRecovery} from '../src/game/online/raceControlSnapshotRecovery.js';
assert.equal(needsRaceControlCacheRecovery(null),true,'missing cache should query online');
assert.equal(needsRaceControlCacheRecovery({cached:null}),true);
assert.equal(needsRaceControlCacheRecovery({cached:{payload:[]}}),true,'cached empty Atlántico cannot hide 11 DB records');
assert.equal(needsRaceControlCacheRecovery({cached:{payload:[{scope:'global',rank:1}]}}),false,'valid cached rows require no extra query');
assert.equal(needsRaceControlCacheRecovery({cached:{payload:{}}}),true,'invalid cache is recovered');

const stats=readFileSync('src/game/scenes/StatsBroadcastScene.js','utf8');
const report=readFileSync('src/game/ui/sessionRecordPublishOffer.js','utf8');
const cache=readFileSync('src/game/stats/localRaceRecords.js','utf8');
const online=readFileSync('src/game/online/raceControlOnline.js','utf8');
assert.match(stats,/needsRaceControlCacheRecovery\(policy\)\)void this\._recoverRaceControlSnapshot\(selected\.trackId\)/);
assert.match(stats,/if\(attempted\.has\(id\)\)return/,'no repeated auto requests');
assert.match(stats,/await ensureRaceControlPilotProfile\(\);\s*const rows=await getRaceControlSnapshot\(id\)/,'authenticated path first');
assert.match(stats,/const rows=await getPublicRaceControlSnapshot\(id\)/,'safe guest fallback');
assert.match(stats,/this\._raceControlPublicMode=true/);
assert.match(stats,/saveCloudSnapshot\(id,rows\)/);
assert.match(stats,/this\._raceControlRenderedTrack===id&&this\._root\?\.querySelector\('\.br-online-board'\)/,'never redraw after leaving or switching track');
assert.match(report,/if\(!row\|\|\(replay\?!row\.record_ref:row\.track_id!==trackId\)\)/,
 'server must confirm either ghost record_ref OR time-only exact track identity');
assert.match(report,/submitRaceControlRecordWithoutGhost\(\{/,
 'online ranking can accept personal best without replay');
assert.ok(report.indexOf('published=true;')<report.indexOf('void getRaceControlSnapshot(trackId)'), 'verified publication precedes optional cache refresh');
assert.match(report,/void getRaceControlSnapshot\(trackId\)\.then\(snapshot=>/);
assert.match(report,/if\(Array\.isArray\(snapshot\)\)saveCloudSnapshot\(trackId,snapshot\)/);
assert.match(report,/\.catch\(err=>console\.warn\('\[race-control\] post-publish ranking refresh unavailable'/,'read errors cannot unpublish');
assert.match(cache,/tdr2:leaderboardSnapshot:\$\{raceControlServerTrackId\(trackId\)\}/,'per-circuit, per-geometry cache');
assert.match(online,/p_track_id:id/,'authenticated leaderboard keyed by exact track');

const migration=readFileSync('supabase/migrations/20261030_024_race_control_100k_query_optimizations.sql','utf8');
assert.match(migration,/fetch first 25 rows with ties/i,
  'Top 25 must preserve ties crossing the 25th row');
assert.match(migration,/rank\(\) over\(order by t\.best_time_ms/i,
  'Rank ties must retain the same rank');
assert.match(migration,/v_my_rank-10/,'The -10 window remains intact');
assert.match(migration,/v_my_rank\+10/,'The +10 window remains intact');
assert.match(migration,/select distinct n\.best_time_ms from near_rows/,
  'Rank counts are evaluated once per distinct near time');
assert.doesNotMatch(migration,/create temporary table|truncate table/i,
  'Rankings must not create or truncate temporary database tables');
assert.match(migration,/get_my_track_personal_best/,'Keep the personal-best RPC versioned');
assert.match(migration,/where tr\.user_id=v_uid and tr\.track_id=v_track/,
  'Personal-best RPC is limited to authenticated UUID and exact edition');
assert.match(migration,/revoke all on function public\.get_my_track_personal_best\(text\) from public,anon/,
  'The indexed personal-best endpoint must not be anonymously callable');
const optimized=readFileSync('supabase/migrations/20261030_025_race_control_single_window_rank.sql','utf8');
assert.match(optimized,/select count\(\*\) into v_prefix_count/,
  'Compute one index-backed count before the bounded rank window');
assert.match(optimized,/v_prefix_count\+rank\(\) over\(order by n\.best_time_ms/,
  'Recover exact global and geographic positions via a bounded window');
assert.match(optimized,/from near_ranked n cross join my_rank m/,
  'The near window still centers on the authenticated own rank');
assert.match(optimized,/m.position-10/,'Preserve the -10 rank window');
assert.match(optimized,/m.position\+10/,'Preserve the +10 rank window');
assert.doesNotMatch(optimized,/exact_ranks|create temporary table|truncate table/i,
  'No O(distinct times) recounts and no per-request temporary tables');

const oldPublic=readFileSync('supabase/migrations/20261028_022_race_control_current_circuits_only.sql','utf8');
const conditionalPublic=readFileSync('supabase/migrations/20261030_027_race_control_skip_unchanged_public_snapshot.sql','utf8');
const tracksFrom=source=>Array.from(source.matchAll(/^\s*\('([^']+)'\),?\s*$/gm),match=>match[1]);
assert.equal(tracksFrom(conditionalPublic).length,13,
  'The public rankings must still include all 13 current track editions');
assert.deepEqual(tracksFrom(conditionalPublic),tracksFrom(oldPublic),
  'Skipping unchanged snapshots must not change the supported circuits');
assert.match(conditionalPublic,/on conflict\(id\) do update set payload=excluded\.payload\s+where/,
  'Only a new public leaderboard warrants an UPDATE');
assert.match(conditionalPublic,/payload->'tracks'\s+is distinct from excluded\.payload->'tracks'/,
  'Compare the actual standings, never generated_at timestamps');
assert.match(conditionalPublic,/payload->'version'\s+is distinct from excluded\.payload->'version'/,
  'A schema-version change must still force a refreshed snapshot');
assert.match(conditionalPublic,/get diagnostics changed_rows = row_count;\s+if changed_rows = 0 then\s+return;/,
  'Stop before daily-stat writes if standings have not changed');
assert.ok(conditionalPublic.indexOf('if changed_rows = 0 then')<
  conditionalPublic.indexOf('insert into tdr_web_private.refresh_daily'),
  'Do not update daily counters on empty refreshes');
assert.match(conditionalPublic,/'refresh_seconds',300/,
  'Continue checking at five-minute intervals');
assert.doesNotMatch(conditionalPublic,/create trigger|alter table|create index/i,
  'Never add database writes to each player publication for a cache check');


const hourlyMigration=readFileSync('supabase/migrations/20261030_028_race_control_hourly_public_rankings.sql','utf8');
assert.match(hourlyMigration,/cron\.alter_job\(job_to_change,schedule => '0 \* \* \* \*'\)/,
  'Public ranking refresh must run once per hour, on the hour');
assert.match(hourlyMigration,/'refresh_seconds',3600/,
  'Public payload must advertise the new 3600-second cadence');
assert.match(hourlyMigration,/payload->'refresh_seconds'\s+is distinct from excluded\.payload->'refresh_seconds'/,
  'Change cadence metadata exactly once even when standings are unchanged');
assert.match(hourlyMigration,/where j\.jobname='tdr-web-rankings-refresh'/,
  'Only the named public leaderboard cron must change');
assert.doesNotMatch(hourlyMigration,/cron\.unschedule|drop table|delete from public\.track_records/i,
  'Do not remove jobs or player records to save polling work');

const ownBestCall=online.slice(online.indexOf('export async function getMyRaceControlRecord'),
  online.indexOf('export async function getRaceControlGhost'));
assert.match(ownBestCall,/\/rpc\/get_my_track_personal_best/,
  'Pre-advertisement check is a one-record indexed lookup');
assert.doesNotMatch(ownBestCall,/get_race_control_snapshot|\.find\(/,
  'Pre-advertisement check must not assemble a full leaderboard');

console.log('PASS: unpersisted/empty ranking recovers once from Supabase and post-race publication caches the verified ranking without additional ads');
