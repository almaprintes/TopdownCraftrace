import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {findExactLocalPbReplay,findExactLocalLapReplay,matchesExactLocalReplay}
 from '../src/game/tracks/exactLocalReplay.js';

const track='karting-tenerife',car='avenir_gripline',lapMs=33554,at=1792959000000;
const samples=Array.from({length:7},(_,i)=>({t:i*5000,x:500+i*30,y:400+i*20,r:0}));
const replay={version:5,trackKey:track,carId:car,lapMs,recordedAt:at,samples};
const record={trackId:track,bestLapMs:lapMs,bestCarId:car,recordedAt:at,
 ghostKey:'tdr2:ghostPb:'+track,topLaps:[{id:'original',trackId:track,carId:car,lapMs,
 timestamp:at,replayKey:'tdr2:topReplay:'+track+':original'}]};
const store=new Map([[record.ghostKey,JSON.stringify({...replay,lapMs:52506})],
 [record.topLaps[0].replayKey,JSON.stringify(replay)]]);
const storage={getItem:key=>store.get(key)||null};
assert.equal(matchesExactLocalReplay(replay,{trackId:track,carId:car,lapMs,recordedAt:at}),true);
assert.equal(matchesExactLocalReplay({...replay,lapMs:52506},{trackId:track,carId:car,lapMs}),false);
assert.equal(matchesExactLocalReplay({...replay,carId:'helix_spark'},{trackId:track,carId:car,lapMs}),false);
assert.equal(matchesExactLocalReplay({...replay,trackKey:track+'-inverso'},{trackId:track,carId:car,lapMs}),false);
assert.equal(matchesExactLocalReplay({...replay,recordedAt:at+60000},{trackId:track,carId:car,lapMs,recordedAt:at}),false);
assert.equal(matchesExactLocalReplay({...replay,samples:[]},{trackId:track,carId:car,lapMs}),false);
assert.equal(findExactLocalPbReplay(record,storage)?.key,record.topLaps[0].replayKey,
 'Old PB ghost pointer must be skipped; exact replay is selected by track+car+time');
assert.equal(findExactLocalLapReplay(record,record.topLaps[0],storage)?.ghost.lapMs,lapMs);
store.delete(record.topLaps[0].replayKey);
assert.equal(findExactLocalPbReplay(record,storage),null,'NO fallback to stale 0:52.506');
assert.equal(findExactLocalLapReplay(record,record.topLaps[0],storage),null);
store.set(record.ghostKey,JSON.stringify({...replay,carId:'other'}));
assert.equal(findExactLocalPbReplay(record,storage),null,'NO cross-car playback');
store.set(record.ghostKey,JSON.stringify(replay));
assert.equal(findExactLocalPbReplay(record,storage)?.key,record.ghostKey);
assert.equal(findExactLocalPbReplay({...record,trackId:track+'-inverso'},storage),null);
const live=readFileSync('src/game/scenes/StatsBroadcastRealReplayScene.js','utf8');
const local=readFileSync('src/game/scenes/StatsBroadcastReplayScene.js','utf8');
const board=readFileSync('src/game/scenes/StatsBroadcastScene.js','utf8');
const offer=readFileSync('src/game/ui/sessionRecordPublishOffer.js','utf8');
const rpc=readFileSync('src/game/online/raceControlOnline.js','utf8');
const sql=readFileSync('supabase/migrations/20261025_020_time_only_record_ghost_integrity.sql','utf8');
assert.ok(live.includes('const replay=findExactLocalPbReplay(selected)'),'PB button requires exact local replay');
assert.ok(live.includes("REPLAY EXACTO NO DISPONIBLE"),'Missing recording is honestly described');
assert.ok(live.includes('const exact=findExactLocalPbReplay(now)'),'Re-check storage on click');
assert.ok(live.includes('matchesExactLocalReplay(ghost,record.expectedLocalReplay)'),'Modal rejects stale recording');
assert.ok(local.includes('findExactLocalLapReplay(state,lap)'),'Top-lap replay must match its own row');
assert.ok(local.includes('findExactLocalLapReplay(current,exactLap)'),'Top-lap link revalidated on click');
assert.ok(!board.includes('if(!selected?.ghostKey||!button'),'Player can publish a legitimate PB with no replay');
assert.ok(board.includes('findExactLocalPbReplay(selected)'));
assert.ok(board.includes('submitRaceControlRecordWithoutGhost({'),'Board supports score-only');
assert.ok(board.includes('submitRaceControlRecordWithGhost({'),'Board still supports score+replay');
assert.ok(board.includes('if(credit?.adVerified!==true&&credit?.promotionGranted!==true)'),'No second ad for same completed claim');
assert.ok(board.indexOf('if(!rewardActionAllowed(ad))')>=0 && board.indexOf('if(!rewardActionAllowed(ad))')<board.indexOf('submitRaceControlRecordWithoutGhost({'),
 'Server publication requires verified ad or explicitly granted November promotion');
assert.ok(offer.includes('submitRaceControlRecordWithoutGhost({'),'Session report must offer score-only');
assert.ok(offer.includes('submitRaceControlRecordWithGhost({'),'Exact ghost still publishes');
assert.ok(offer.includes('No existe una repetición exacta'),'User must be informed before paying for score-only');
assert.ok(offer.indexOf('if(!rewardActionAllowed(result))')>=0 && offer.indexOf('if(!rewardActionAllowed(result))')<offer.indexOf('submitRaceControlRecordWithoutGhost({'));
assert.ok(rpc.includes("'/rest/v1/rpc/submit_track_record'"),'Reuse authenticated score-only RPC');
assert.ok(sql.includes('ghost_payload=null'),'New PB without replay clears an older ghost');
assert.ok(sql.includes('record_ref=gen_random_uuid()'),'Old ghost references are invalidated');
assert.ok(sql.includes('to authenticated;')&&sql.includes('from anon;'),'Keep original authenticated-only RPC permissions');
console.log('PASS: exact PB replay identity; no incorrect fallback; missing replay -> score-only with rewarded consent; server stale-ghost clearing; no changes to saved PB or unrelated lap.');
