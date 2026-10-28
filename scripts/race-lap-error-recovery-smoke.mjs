// One validated lap must never crash the game because UI or local loot storage fails.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {runRaceLapCompletionEffects} from '../src/game/scenes/raceLapCompletionEffects.js';
import {summarizeStoredRuntimeErrors,formatStoredRuntimeErrors,
 RUNTIME_LAST_EVENT_KEY,RUNTIME_FLIGHT_KEY,RACE_LAST_LAP_ERROR_KEY}
 from '../src/game/dev/runtimeSupportReport.js';

const called=[];
const scene={
 trackKey:'karting-americas',
 _registerLapRecords:row=>{called.push('record:'+row.lapMs);return{carBest:false,circuitRecord:false};},
 _showTimingAchievement:()=>called.push('record-ui'),
 _showRaceLoot:reward=>called.push('loot-ui:'+reward.scrap)
};
const success=runRaceLapCompletionEffects({scene,row:{lapMs:34600},
 grantLoot:({trackKey,lapMs})=>{called.push('loot:'+trackKey+':'+lapMs);return{scrap:2};}});
assert.deepEqual(success,{processed:true,rewardGranted:true,failures:[]});
assert.deepEqual(called,['record:34600','record-ui','loot:karting-americas:34600','loot-ui:2']);
const errors=[],calls=[];
const badScene={trackKey:'karting-americas',
 _registerLapRecords:()=>{calls.push('record');throw Error('record failed');},
 _showTimingAchievement:()=>calls.push('record-ui'),
 _showRaceLoot:()=>calls.push('loot-ui')};
const recordsFail=runRaceLapCompletionEffects({scene:badScene,row:{lapMs:34500},
 grantLoot:()=>{calls.push('loot');return{scrap:1};},
 reportFailure:(phase,error)=>errors.push([phase,error.message])});
assert.deepEqual(recordsFail,{processed:true,rewardGranted:true,failures:['register-records']});
assert.deepEqual(calls,['record','loot','loot-ui']);
assert.deepEqual(errors,[['register-records','record failed']]);
const lootFail=runRaceLapCompletionEffects({scene,row:{lapMs:37000},
 grantLoot:()=>{throw Error('QuotaExceededError');},
 reportFailure:(phase,error)=>errors.push([phase,error.message])});
assert.deepEqual(lootFail,{processed:true,rewardGranted:false,failures:['persist-loot']});
assert.deepEqual(errors.at(-1),['persist-loot','QuotaExceededError']);
const uiFails=runRaceLapCompletionEffects({scene:{
 trackKey:'karting-americas',
 _registerLapRecords:()=>({carBest:false,circuitRecord:false}),
 _showTimingAchievement:()=>{throw Error('UI record');},
 _showRaceLoot:()=>{throw Error('UI loot');}
},row:{lapMs:39000},grantLoot:()=>({scrap:2}),
 reportFailure:(phase,error)=>errors.push([phase,error.message])});
assert.deepEqual(uiFails.failures,['display-records','display-loot']);
assert.equal(uiFails.rewardGranted,true);
assert.equal(runRaceLapCompletionEffects({scene,row:null,grantLoot:()=>{throw Error('Should not run')}}).processed,false);

// Old crashed sessions must remain readable even if a subsequent reload writes
// unexpected_reload as the latest event (existing DEV 1.3.33 behaviour).
const obj={
 [RUNTIME_LAST_EVENT_KEY]:JSON.stringify({type:'unexpected_reload',scene:'race',at:'2026-10-25T19:09:30Z'}),
 [RUNTIME_FLIGHT_KEY]:JSON.stringify([{type:'js_error',scene:'race',at:'2026-10-25T19:08:00Z',
 message:'Example failure at lap',source:'/assets/race.js',line:123,column:45}]),
 [RACE_LAST_LAP_ERROR_KEY]:JSON.stringify({at:'2026-10-25T19:08:03Z',phase:'persist-loot',
 track:'karting-americas',lapMs:34000,message:'Example storage problem'})
};
const storage={getItem:key=>obj[key]??null};
const report=summarizeStoredRuntimeErrors(storage);
assert.equal(report.errors.length,2);
assert.equal(report.errors[0].type,'unexpected_reload');
assert.ok(report.errors.some(e=>e.type==='js_error'&&e.message==='Example failure at lap'));
const message=formatStoredRuntimeErrors(storage);
assert.match(message,/Example failure at lap/);
assert.match(message,/Example storage problem/);
assert.match(message,/línea 123:45/);
assert.match(formatStoredRuntimeErrors({getItem:()=>null}),/no hay ningún error/);

const sceneSource=fs.readFileSync('src/game/scenes/RaceWideCameraPreviewScene.js','utf8');
assert.ok(sceneSource.includes('runRaceLapCompletionEffects({'));
assert.ok(sceneSource.includes("tdr2:raceLastLapError"));
assert.ok(!sceneSource.includes('const reward = grantRaceLoot({ trackKey: this.trackKey'),
 'The unguarded lap grant must not regress');
const crash=fs.readFileSync('src/game/dev/runtimeCrashDiagnostics.js','utf8');
assert.ok(crash.includes("store(LAST_JS_ERROR_KEY,info)"));
assert.ok(crash.includes("node.textContent=`DIAGNÓSTICO"));
const admin=fs.readFileSync('src/game/scenes/AdminHubScene.js','utf8');
// The PADDOCK redesign keeps diagnostics via the new card and handler.
const paddock=fs.readFileSync('src/game/ui/adminPaddockView.js','utf8');
assert.ok(paddock.includes("name:'DIAGNÓSTICO'"));
assert.ok(paddock.includes("run:handlers.diagnostics"));
assert.ok(admin.includes("diagnostics:()=>this._showLastRuntimeError()"));
assert.ok(admin.includes('this._showLastRuntimeError()'));
assert.ok(admin.includes("import('../dev/runtimeSupportReport.js')"));
assert.ok(admin.includes('textarea')||admin.includes("createElement('textarea')"));
assert.ok(admin.includes("this._errorPreview?.remove?.()"));
const helper=fs.readFileSync('src/game/scenes/raceLapCompletionEffects.js','utf8');
assert.doesNotMatch(helper,/requestAnimationFrame|setInterval|fetch\(/);
console.log('PASS lap safety: record/reward/HUD errors cannot escape to game loop; old JavaScript message retrievable after reload; no online publication or lap timing altered.');
