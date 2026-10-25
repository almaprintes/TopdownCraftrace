import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {sessionPersonalBest,localRecordGhost,RECORD_PUBLISH_DISCLOSURE,fmtPersonalBest} from '../src/game/ui/sessionPersonalBestPublish.js';

const lap=(ms,valid=true)=>({n:1,lapMs:ms,valid});
assert.deepEqual(sessionPersonalBest({bestMs:39917,laps:[lap(39917)]},45000),
  {lapMs:39917,previousMs:45000,improvementMs:5083});
assert.deepEqual(sessionPersonalBest({bestMs:39917,laps:[lap(39917)]},null),
  {lapMs:39917,previousMs:null,improvementMs:null},
  'First valid PB must qualify');
assert.equal(sessionPersonalBest({bestMs:39917,laps:[lap(39917)]},39000),null,'Slower than historic PB');
assert.equal(sessionPersonalBest({bestMs:39917,laps:[lap(39917)]},39917),null,'Matching PB is not a record');
assert.equal(sessionPersonalBest({bestMs:39917,laps:[lap(39917,false)]},44000),null,'Invalid laps cannot publish');
assert.equal(sessionPersonalBest({bestMs:0,laps:[]},44000),null,'No completed lap cannot publish');
assert.equal(sessionPersonalBest({bestMs:39917,laps:[lap(41000)]},45000),null,'Session best must match a completed lap');
assert.equal(fmtPersonalBest(39317),'0:39.317');
assert.ok(RECORD_PUBLISH_DISCLOSURE.includes('voluntariamente')&&RECORD_PUBLISH_DISCLOSURE.includes('30 segundos'));
assert.ok(RECORD_PUBLISH_DISCLOSURE.includes('No aparecerá automáticamente'));
const storage=new Map();
globalThis.localStorage={
  get length(){return storage.size;},
  key:index=>[...storage.keys()][index]??null,
  getItem:key=>storage.get(key)||null,
  setItem:(key,value)=>storage.set(key,value),
  removeItem:key=>storage.delete(key)
};
const ghost={trackKey:'karting-tenerife',carId:'helix_spark',lapMs:39917,samples:Array.from({length:10},(_,i)=>({t:i*100,x:20+i*3,y:100+i*5,r:.6}))};
storage.set('tdr2:ghost:karting-tenerife:helix_spark',JSON.stringify(ghost));
assert.equal(localRecordGhost('karting-tenerife','helix_spark',39917)?.samples.length,10);
assert.equal(localRecordGhost('karting-tenerife','helix_spark',38700),null,'No obsolete ghost with a new record');
assert.equal(localRecordGhost('karting-tenerife','different-car',39917),null,'Car ID must match');
const oldKey='tdr2:ghost:karting-tenerife:helix_spark';
storage.delete(oldKey);
const officialKey='tdr2:topReplay:'+encodeURIComponent('karting-tenerife')+':verified-39917';
storage.set('tdr2:ttBest:karting-tenerife',JSON.stringify({lapMs:39917,carId:'helix_spark',ghostKey:officialKey}));
storage.set(officialKey,JSON.stringify(ghost));
assert.equal(localRecordGhost('karting-tenerife','helix_spark',39917)?.samples.length,10,
  'Report publishing must resolve the exact saved Records replay without an ad');
const view=readFileSync('src/game/ui/sessionRecordPublishOffer.js','utf8');
const source=readFileSync('src/game/scenes/RaceSessionReportScene.js','utf8');
for(const x of [
 '¡ENHORABUENA! NUEVO RÉCORD PERSONAL',
 '¿Quieres publicarlo en la clasificación online?',
 'PUBLICAR · VER ANUNCIO','AHORA NO',
 'getPilotProfile()','localRecordGhost(trackId,carId,best.lapMs)',
 'if(!isRewardedAdAvailable()&&!adVerified)',
 'await ensureRaceControlPilotProfile()',
 'await showRewardedAd(scene,',
 'REWARDED_PLACEMENTS.RACE_CONTROL_PUBLISH',
 'if(!verifiedReward(result))',
 'adVerified=true',
 'await submitRaceControlRecordWithGhost({',
 'if(!row||(replay?!row.record_ref:row.track_id!==trackId))',
 'if(adVerified)publish.textContent=',
 'REINTENTAR PUBLICACIÓN · SIN OTRO ANUNCIO',
 'actions.hidden=true'
])assert.ok(view.includes(x),'Missing explicitly optional consent flow or server verification: '+x);
const earlyChecks=view.indexOf('const ghost=localRecordGhost');
const adCall=view.indexOf('const result=await showRewardedAd');
const submit=view.indexOf('const response=replay');
assert.ok(earlyChecks>=0&&adCall>earlyChecks&&submit>adCall,
  'Validate replay and online readiness BEFORE showing a rewarded ad');
assert.ok(view.includes("raceControlPublishClaimId(trackId,best.lapMs)"));
assert.ok(view.includes('ghostSampleCount:replay.count'));
assert.ok(view.includes('submitRaceControlRecordWithoutGhost({'));
assert.ok(view.includes('No existe una repetición exacta'));
assert.ok(source.includes('mountNewPersonalBestOffer(this,root,r);'));
assert.ok(source.includes('this._sessionPreviousPersonalBestMs='));
assert.ok(source.includes('valid:e?.valid!==false&&e?.invalid!==true'));
assert.ok(source.indexOf('installSessionReportNavigation(root)')<source.indexOf('mountNewPersonalBestOffer(this,root,r)'));
const navig=readFileSync('src/game/ui/sessionReportNavigation.js','utf8');
assert.ok(navig.includes("const TABS=[")&&navig.includes('VUELTAS'),'New three-page report retained');
console.log('Record publication offer: PB vs historic best, invalid lap rejection, ghost match, explicit voluntary 30s ad disclosure, verified rewarded submission and ad-free retry OK');
