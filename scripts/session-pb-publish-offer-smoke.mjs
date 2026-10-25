import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {sessionPersonalBest,localRecordGhost,RECORD_PUBLISH_DISCLOSURE} from '../src/game/ui/sessionPersonalBestPublish.js';

const session=(...ms)=>({bestMs:ms.length?Math.min(...ms):null,laps:ms.map((lapMs,n)=>({n:n+1,lapMs}))});
assert.equal(sessionPersonalBest(session(),45000),null,'No completed lap means no PB offer');
assert.equal(sessionPersonalBest(session(45100),45000),null,'Slower lap must not get a celebration');
assert.equal(sessionPersonalBest(session(45000),45000),null,'Equal lap is not a new record');
assert.equal(sessionPersonalBest(session(45100,44700),45000)?.improvementMs,300,
  'Session best must be compared against the PB captured BEFORE the race');
assert.equal(sessionPersonalBest(session(44700),null)?.previousMs,null,
  'First valid lap establishes a first personal record');
assert.equal(sessionPersonalBest(session(44700),44500),null,'Old faster PB wins');
assert.equal(sessionPersonalBest({bestMs:44900,laps:[{lapMs:47700}]},45000),null,
  'Never offer a record not actually achieved during the current session');

const storage=new Map();
globalThis.localStorage={
  get length(){return storage.size;},
  key(index){return [...storage.keys()][index]??null;},
  getItem(key){return storage.get(key)||null;},
  setItem(key,value){storage.set(key,value);},
  removeItem(key){storage.delete(key);}
};
const track='karting-tenerife',car='spark',lapMs=44700;
storage.set('tdr2:ghost:'+track+':'+car,JSON.stringify({
  trackKey:track,carId:car,lapMs,samples:Array.from({length:6},(_,i)=>({t:i*1000,x:120+i*12,y:200,r:0}))
}));
assert.equal(localRecordGhost(track,car,lapMs)?.samples.length,6);
assert.equal(localRecordGhost(track,'other-car',lapMs),null,'Wrong car ghost must not publish');
assert.equal(localRecordGhost(track,car,lapMs-100),null,'Stale ghost time must not publish as faster PB');
assert.equal(localRecordGhost('wrong-track',car,lapMs),null,'Wrong circuit ghost must not publish');

// Real Android QA regression: the newer Records section knows a persisted
// topReplay/ttBest ghost while the original 'tdr2:ghost' key is absent.
const legacyKey='tdr2:ghost:'+track+':'+car;
const savedLegacy=storage.get(legacyKey);
storage.delete(legacyKey);
const replayKey='tdr2:topReplay:'+encodeURIComponent(track)+':proof';
const replay={trackKey:track,carId:car,lapMs,samples:Array.from({length:8},(_,i)=>({t:i*750,x:150+i*3,y:230+i*7,r:0}))};
storage.set('tdr2:ttBest:'+track,JSON.stringify({lapMs,carId:car,ghostKey:replayKey}));
storage.set(replayKey,JSON.stringify(replay));
assert.equal(localRecordGhost(track,car,lapMs)?.samples.length,8,
  'PB offer can use the same official saved replay that the Records view publishes');
assert.equal(localRecordGhost(track,'other-car',lapMs),null,
  'Official replay must never be attributed to another car');
assert.equal(localRecordGhost(track,car,lapMs-100),null,
  'Official replay must never be attributed to a faster, different lap');
storage.set(replayKey,JSON.stringify({...replay,trackKey:'wrong-track'}));
assert.equal(localRecordGhost(track,car,lapMs),null,'Tampered replay track is rejected');
storage.set(replayKey,JSON.stringify({...replay,carId:'another-car'}));
assert.equal(localRecordGhost(track,car,lapMs),null,'Tampered replay car is rejected');
storage.set(replayKey,JSON.stringify({...replay,lapMs:lapMs+20}));
assert.equal(localRecordGhost(track,car,lapMs),null,'Outdated replay time is rejected');
storage.set(replayKey,JSON.stringify(replay));
storage.set(legacyKey,savedLegacy);
assert.equal(localRecordGhost(track,car,lapMs)?.samples.length,6,'Legacy recording remains preferred when valid');

const offer=readFileSync('src/game/ui/sessionRecordPublishOffer.js','utf8');
const report=readFileSync('src/game/scenes/RaceSessionReportScene.js','utf8');
const rpc=readFileSync('src/game/online/raceControlOnline.js','utf8');
const ads=readFileSync('src/game/monetization/rewardedActions.js','utf8');
const rewardProvider=readFileSync('src/game/monetization/RewardedAdsProvider.js','utf8');
assert.match(RECORD_PUBLISH_DISCLOSURE,/anuncio recompensado/i);
assert.match(RECORD_PUBLISH_DISCLOSURE,/30 segundos/i);
assert.match(RECORD_PUBLISH_DISCLOSURE,/No aparecerá automáticamente/i);
assert.ok(offer.includes('¡ENHORABUENA! NUEVO RÉCORD PERSONAL'));
assert.ok(offer.includes('¿Quieres publicarlo en la clasificación online?'));
assert.ok(offer.includes('PUBLICAR · VER ANUNCIO'));
assert.ok(offer.includes('AHORA NO'));
assert.ok(offer.includes("skip.addEventListener('click',skipOffer)"));
assert.ok(offer.includes("publish.addEventListener('click',async()=>"),'Ad must need explicit user intent');
assert.ok(offer.indexOf("await ensureRaceControlPilotProfile()")<offer.indexOf("await showRewardedAd(scene"),
  'Check online connectivity BEFORE consuming the optional ad');
assert.ok(offer.indexOf('const ghost=localRecordGhost')<offer.indexOf('await showRewardedAd(scene'),
  'Check for an exact ghost before offering either publication format');
assert.ok(offer.indexOf('const bytes=encodeOnlineGhostNativeBinary')<offer.indexOf('await showRewardedAd(scene'),
  'Encode and size-check ghost before showing ad');
assert.ok(offer.includes('if(!verifiedReward(result))throw'), 'Publication requires a verified finished ad');
assert.ok(offer.indexOf('if(!verifiedReward(result))throw')<offer.indexOf('await submitRaceControlRecordWithGhost'),
  'Do not publish without completing the rewarded ad');
assert.ok(offer.includes('verifiedPublishClaims.set(claimId,{adVerified:true,published:false})'),
  'Credit a completed rewarded ad to allow retry');
assert.ok(offer.includes('if(!adVerified){'),'Retry must not start another ad');
assert.ok(offer.includes('REINTENTAR PUBLICACIÓN · SIN OTRO ANUNCIO'));
assert.ok(offer.includes("setStatus('No has elegido publicar. No se mostrará ningún anuncio.')"));
assert.ok(offer.includes('if(!row||(replay?!row.record_ref:row.track_id!==trackId))'),
  'Both ghost and time-only publications must have server acknowledgement');
assert.ok(offer.includes('submitRaceControlRecordWithoutGhost({'),
  'No recorded replay still permits publishing the personal best after an ad');
assert.ok(offer.includes('No existe una repetición exacta'),
  'The player must agree explicitly to time-only publication');
assert.ok(report.includes('this._sessionPreviousPersonalBestMs='),'Persist pre-session comparison baseline');
assert.ok(report.includes('mountNewPersonalBestOffer(this,root,r)'),'Mount celebration within report');
assert.ok(report.indexOf('installSessionReportNavigation(root);')<report.indexOf('mountNewPersonalBestOffer(this,root,r);'),
  'The report summary tab must exist before attaching the PB card');
assert.ok(ads.includes("RACE_CONTROL_PUBLISH:'race_control_publish_record'"));
assert.ok(rpc.includes("'/rest/v1/rpc/submit_track_record_with_ghost'"));
assert.ok(rewardProvider.includes('isRewardedAdAvailable()'));
console.log('PB report offer: truly new session PB only; clear ad disclosure; opt-in click; verified ad; ghost/network preflight; no duplicate-ad retry; successful publication requires server ack OK');
