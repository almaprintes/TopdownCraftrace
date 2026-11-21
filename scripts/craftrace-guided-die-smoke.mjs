// DEV-only deterministic validation of the die objective and physical pass audit.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 GUIDED_DIE_TOLERANCE_PX,rollGuidedDie,nextGuidedApex,
 physicalPointSegmentDistance,measureGuidedPass,closeGuidedLap
} from '../src/game/online/craftraceGuidedDie.js';

assert.deepEqual(GUIDED_DIE_TOLERANCE_PX.slice(1),[35,35,20,20,5,5]);
for(let f=1;f<=6;f++){
 const die=rollGuidedDie(()=>((f-.5)/6));
 assert.equal(die.face,f);
 assert.equal(die.tolerancePx,GUIDED_DIE_TOLERANCE_PX[f]);
}
const guides=[{id:'apex-1',index:10,x:10,y:0},{id:'apex-2',index:75,x:20,y:0}];
assert.equal(nextGuidedApex(guides,4,100,18)?.id,'apex-1');
assert.equal(nextGuidedApex(guides,96,100,18)?.id,'apex-1');
assert.equal(nextGuidedApex(guides,13,100,18),null);
assert.equal(physicalPointSegmentDistance({x:10,y:0},{x:5,y:4},{x:15,y:4}),4);

const bot={completedLaps:1,guidedRoll:6,guidedTolerancePx:5,
 guidedLapHistory:[],_guidedNearestPx:{}};
measureGuidedPass(bot,guides,{x:5,y:4},{x:15,y:4},10,100);
const hit=closeGuidedLap(bot,guides);
assert.equal(hit.checked,1);
assert.equal(hit.hits,1);
assert.equal(hit.checks[0].closestPx,4);
bot.completedLaps++;
measureGuidedPass(bot,guides,{x:5,y:12},{x:15,y:12},10,100);
const miss=closeGuidedLap(bot,guides);
assert.equal(miss.hits,0);
assert.equal(miss.checks[0].closestPx,12);
assert.equal(bot.guidedLapHistory.length,2);
const controller=readFileSync('src/game/ai/survivalPhysicalBotController.js','utf8');
const director=readFileSync('src/game/online/craftraceLiveV2BotDirector.js','utf8');
const real=readFileSync('src/game/online/craftraceDirectorPreview.js','utf8');
assert.ok(controller.includes("precisionCornering&&guidance?.guides?.length"));
assert.ok(controller.includes("predictedMiss-guideTolerance"));
assert.ok(controller.includes("targetSpeed*controlScale*(1-.28*missRisk)"));
assert.ok(director.includes("this.preview&&this.previewMode==='G'&&"));
assert.ok(director.includes("if(guidedActive&&lapPassed)"));
assert.ok(director.includes("measureGuidedPass(bot,this.previewGuideTargets"));
assert.ok(real.includes('Los aciertos son distancias físicas medidas'));
assert.ok(!controller.includes('setPosition('),'No position teleportation from guided controller');
console.log('PASS G die 1-6, per-lap commitments, true 5px segment hit/miss and DEV isolation');
