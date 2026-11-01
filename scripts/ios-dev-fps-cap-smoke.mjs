import assert from 'node:assert/strict';
import { IOS_DEV_FPS_CAP_KEY, resolveIosDevFpsCap } from '../src/game/performance/iosDevFpsCapTrial.js';

const disabled={getItem:()=>null};
const enabled={getItem:key=>key===IOS_DEV_FPS_CAP_KEY?'1':null};
const options={isIphone:true,isProd:false,safeMode:false,baseLimit:0};

assert.deepEqual(resolveIosDevFpsCap({...options,storage:disabled}),{limit:0,baseLimit:0,mode:'BASE'});
assert.deepEqual(resolveIosDevFpsCap({...options,storage:enabled}),{limit:60,baseLimit:0,mode:'CAP_60'});
assert.deepEqual(resolveIosDevFpsCap({...options,isProd:true,storage:enabled}),{limit:0,baseLimit:0,mode:'BASE'});
assert.deepEqual(resolveIosDevFpsCap({...options,isIphone:false,storage:enabled}),{limit:0,baseLimit:0,mode:'BASE'});
assert.deepEqual(resolveIosDevFpsCap({...options,safeMode:true,storage:enabled}),{limit:0,baseLimit:0,mode:'BASE'});
assert.deepEqual(resolveIosDevFpsCap({...options,baseLimit:30,storage:enabled}),{limit:30,baseLimit:30,mode:'BASE'});
assert.deepEqual(resolveIosDevFpsCap({...options,baseLimit:60,storage:enabled}),{limit:60,baseLimit:60,mode:'BASE'});
assert.deepEqual(resolveIosDevFpsCap({...options,baseLimit:120,storage:enabled}),{limit:60,baseLimit:120,mode:'CAP_60'});
assert.deepEqual(resolveIosDevFpsCap({...options,storage:{getItem(){throw Error('storage blocked');}}}),{limit:0,baseLimit:0,mode:'BASE'});
assert.equal(IOS_DEV_FPS_CAP_KEY,'tdr2:devIosFpsCap60:v1');
// Ensure the checked-out game actually uses the resolver and exposes an opt-in UI.
import {readFileSync} from 'node:fs';
const game=readFileSync(new URL('../src/game/game.js',import.meta.url),'utf8');
const diag=readFileSync(new URL('../src/game/dev/iosRaceFrameDiagnostics.js',import.meta.url),'utf8');
assert.match(game,/const fpsTrial=resolveIosDevFpsCap\(/);
assert.match(game,/const frameLimit=fpsTrial\.limit/);
assert.match(game,/isProd:IS_PROD_BUILD,safeMode,storage:localStorage/);
assert.match(game,/fpsTrialMode:fpsTrial\.mode/);
assert.match(diag,/PROBAR FPS 60 \(REINICIA\)/);
assert.match(diag,/VOLVER FPS BASE \(REINICIA\)/);
assert.match(diag,/localStorage\.removeItem\(IOS_DEV_FPS_CAP_KEY\)/);
assert.match(diag,/localStorage\.setItem\(IOS_DEV_FPS_CAP_KEY,'1'\)/);
assert.match(diag,/if\(Number\(fpsConfig\.baseFrameLimit\|\|0\)===0\)/);
console.log('iOS DEV FPS cap A/B smoke OK (resolver + integration). Android and production unchanged.');
