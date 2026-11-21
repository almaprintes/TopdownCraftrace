// DEV-only deterministic validation of the die objective and physical pass audit.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 GUIDED_DIE_TOLERANCE_PX,rollGuidedDie,nextGuidedApex,
 physicalPointSegmentDistance,measureGuidedPass,closeGuidedLap
} from '../src/game/online/craftraceGuidedDie.js';
import {buildDirectorLapReport,fmtDirectorTime}
 from '../src/game/online/craftraceDirectorLapReport.js';

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
// Realizador reports every real lap, totals, best laps and actual rank.
const lapReport=buildDirectorLapReport([
 {seat:0,lapTimes:[22000,20700,21000],elapsedMs:63700},
 {seat:1,lapTimes:[21500,20300,20400],elapsedMs:62200},
 {seat:2,lapTimes:[24000,22000,23000],elapsedMs:69000},
 {seat:3,lapTimes:[22200,21000,20800],elapsedMs:64000}
],3);
assert.deepEqual(lapReport.rows.map(row=>row.seat),[1,0,3,2]);
assert.deepEqual(lapReport.rows[0].lapTimes,[21500,20300,20400]);
assert.equal(lapReport.rows[0].totalMs,62200);
assert.equal(lapReport.rows[0].bestLapMs,20300);
assert.equal(lapReport.fastestLapMs,20300);
assert.equal(fmtDirectorTime(20300),'0:20.300');
assert.equal(fmtDirectorTime(62200),'1:02.200');
assert.equal(fmtDirectorTime(null),'—');
const longReport=buildDirectorLapReport([{seat:0,
 lapTimes:Array.from({length:20},(_,i)=>20000+i)}],20);
assert.equal(longReport.rows[0].lapTimes.length,20);
assert.equal(longReport.rows[0].totalMs,20*20000+190);
assert.ok(real.includes("buildDirectorLapReport(bots.results(),laps)"));
assert.ok(real.includes('data-lap-table'));
assert.ok(real.includes('TIEMPOS REALES POR VUELTA'));
assert.ok(!real.includes('🎲')&&!real.includes('dieStatus')&&
 !real.includes('Dado por IA y vuelta'),
 'Die rolls must remain totally hidden during the race and in the results');
assert.ok(!controller.includes('setPosition('),'No position teleportation from guided controller');
console.log('PASS G invisible auto-die, real apex pass accuracy and 1-20 lap timing report');
