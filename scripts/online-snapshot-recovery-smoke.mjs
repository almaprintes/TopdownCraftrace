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
const ownBestCall=online.slice(online.indexOf('export async function getMyRaceControlRecord'),
  online.indexOf('export async function getRaceControlGhost'));
assert.match(ownBestCall,/\/rpc\/get_my_track_personal_best/,
  'Pre-advertisement check is a one-record indexed lookup');
assert.doesNotMatch(ownBestCall,/get_race_control_snapshot|\.find\(/,
  'Pre-advertisement check must not assemble a full leaderboard');

console.log('PASS: unpersisted/empty ranking recovers once from Supabase and post-race publication caches the verified ranking without additional ads');
