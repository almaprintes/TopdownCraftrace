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
console.log('iOS FPS-cap DEV A/B smoke OK (10 checks). No changes to Android, production, safety mode or existing lower caps.');
