import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  SUPPORT_DIAGNOSTICS_KEY, SUPPORT_DIAGNOSTICS_DURATION_MS,
  advanceSupportUnlockTap,supportDiagnosticsEnabled,setSupportDiagnosticsEnabled
} from '../src/game/support/supportRaceDiagnostics.js';
const store=new Map();
const storage={getItem:key=>store.get(key)??null,setItem:(key,value)=>store.set(key,value),removeItem:key=>store.delete(key)};
const t=100000;
assert.equal(supportDiagnosticsEnabled(storage,t),false,'Support must start hidden');
let taps={count:0,lastAt:0};
for(let i=0;i<6;i++){taps=advanceSupportUnlockTap(taps,t+i*250);assert.equal(taps.unlocked,false);}
taps=advanceSupportUnlockTap(taps,t+6*250);
assert.equal(taps.unlocked,true,'Seventh deliberate tap activates support');
assert.equal(setSupportDiagnosticsEnabled(storage,true,t),true);
assert.equal(store.get(SUPPORT_DIAGNOSTICS_KEY),String(t+SUPPORT_DIAGNOSTICS_DURATION_MS));
assert.equal(supportDiagnosticsEnabled(storage,t+SUPPORT_DIAGNOSTICS_DURATION_MS-1),true);
assert.equal(supportDiagnosticsEnabled(storage,t+SUPPORT_DIAGNOSTICS_DURATION_MS),false,'Support auto-expires');
taps=advanceSupportUnlockTap({count:6,lastAt:t},t+6000);
assert.equal(taps.count,1,'The gesture expires after five seconds');
assert.equal(setSupportDiagnosticsEnabled(storage,false,t),true);
assert.equal(supportDiagnosticsEnabled(storage,t),false,'Manual disable revokes support');
assert.equal(supportDiagnosticsEnabled({getItem:()=>{throw Error('blocked');}},t),false,'Private-mode storage errors fail closed');

const settings=fs.readFileSync('src/game/scenes/SettingsGraphicsQualityScene.js','utf8');
const race=fs.readFileSync('src/game/scenes/RaceTelemetryHudScene.js','utf8');
const panel=fs.readFileSync('src/game/dev/iosRaceFrameDiagnostics.js','utf8');
assert.match(settings,/data-support-unlock/);
assert.match(settings,/advanceSupportUnlockTap\(supportTapState\)/);
assert.match(settings,/data-support-disable/);
assert.match(settings,/supportDiagnosticsEnabled\(sessionStorage\)\?/,'No visible support setting until unlocked');
assert.match(race,/mountRaceDevFrameDiagnostics\(this\)/);
assert.match(panel,/!supportDiagnosticsEnabled\(sessionStorage\)/);
assert.match(panel,/if\(!IS_PROD_BUILD&&isIos\(\)\)/);
assert.match(panel,/if\(!state\.active\)/,'No frame metrics before user presses MEDIR');
assert.match(panel,/P95\/P99/);
assert.match(panel,/RÁFAGAS >50ms/);
assert.match(panel,/const copyButton=control\('COPIAR'/);
assert.match(panel,/PERF /);
assert.match(panel,/scene\.events\.off\(Phaser\.Scenes\.Events\.POST_UPDATE,state\.scenePost\)/);
console.log('PASS: hidden, expiring support unlock; opt-in cross-platform read-only public diagnostics; DEV-only tuning tools');
