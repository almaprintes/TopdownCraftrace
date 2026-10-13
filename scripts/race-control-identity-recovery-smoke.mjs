// Regression: orphan Supabase record + nickname owned by another UUID.
// No ghost, rewards, or historical records are deleted or silently reattributed.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(p,'utf8');
const online=read('src/game/online/raceControlOnline.js');
const identity=read('src/game/online/onlinePilotIdentity.js');
const race=read('src/game/scenes/StatsBroadcastScene.js');
const report=read('src/game/ui/sessionRecordPublishOffer.js');
const sql=read('supabase/migrations/20261014_015_get_my_pilot_profile.sql');
const shared=read('src/game/online/verifiedRecordPublishClaims.js');

assert.match(sql,/security definer/i);
assert.match(sql,/where p\.user_id = auth\.uid\(\)/);
assert.match(sql,/grant execute on function public\.get_my_pilot_profile\(\) to authenticated/);
assert.match(sql,/revoke all on function public\.get_my_pilot_profile\(\) from public, anon/);
assert.match(online,/\/rest\/v1\/rpc\/get_my_pilot_profile/);
assert.match(online,/export async function getPublicRaceControlSnapshot/);
assert.match(online,/web_leaderboard_snapshot\?select=payload&id=eq.true/);
assert.match(online,/record_ref:null,ghost_available:false,is_me:false/);
assert.match(identity,/await getMyRaceControlProfile\(\)/);
assert.match(identity,/claimRaceControlPilotNick\(local\)/);
assert.match(identity,/existing.nick!==local/);
assert.match(identity,/NICK_IDENTITY_CONFLICT/);
assert.ok(identity.indexOf('await getMyRaceControlProfile()')<identity.indexOf('claimRaceControlPilotNick(local)'),
  'Existing server profile must be checked before attempting any nickname write');
assert.ok(report.indexOf('await ensureRaceControlPilotProfile()')<report.indexOf('await showRewardedAd(scene'),
  'Report must not show a rewarded ad before identity validation');
assert.ok(race.indexOf('await ensureRaceControlPilotProfile();',race.indexOf('async _publishRaceControlRecord'))<
  race.indexOf('const ad=await showRewardedAd(',race.indexOf('async _publishRaceControlRecord')),
  'Race Control must not show rewarded ad before identity validation');
assert.match(race,/getPublicRaceControlSnapshot\(selected.trackId\)/);
assert.match(race,/saveCloudSnapshot\(selected.trackId,global\)/);
assert.match(race,/this\._raceControlScope='global'/);
assert.match(race,/this\._showRaceControlNotice\(message\)/);
assert.match(race,/verifiedRecordPublishClaims\.set\(claimId,\{adVerified:true,published:true\}\)/);
assert.match(report,/verifiedRecordPublishClaims as verifiedPublishClaims/);
assert.match(shared,/export const verifiedRecordPublishClaims=new Map\(\)/);
assert.match(report,/actions\.hidden=true;actions\.style\.display='none'/);
assert.ok(race.indexOf('verifiedRecordPublishClaims.set(claimId,{adVerified:true,published:true})')<
  race.indexOf('const snapshot=await getRaceControlSnapshot(selected.trackId);',race.indexOf('async _publishRaceControlRecord')),
  'A refresh failure must never invalidate a successfully published record or consume another ad');
console.log('Race Control nickname conflict: secure profile gate, no orphan submissions, public GLOBAL fallback, verified ad-free retry, safe report actions OK');
