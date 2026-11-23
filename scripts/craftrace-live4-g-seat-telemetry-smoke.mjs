import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {live4AiSeatPaceBias,newLive4GPhysicalLap,
 measureLive4GPhysicalLap,summarizeLive4GPhysicalLap}
 from '../src/game/online/craftraceLiveV2BotDirector.js';
for(const style of [0,1,2]){
 assert.equal(live4AiSeatPaceBias({guidedG:true,difficulty:3,style}),1,
  'Identical max speed for all guided G experts regardless of seat');
}
assert.equal(live4AiSeatPaceBias({guidedG:false,difficulty:3,style:0}),1);
assert.equal(live4AiSeatPaceBias({guidedG:false,difficulty:3,style:1}),.985);
assert.equal(live4AiSeatPaceBias({guidedG:false,difficulty:3,style:2}),.97);
assert.equal(live4AiSeatPaceBias({guidedG:true,difficulty:2,style:2}),.97);
const lap=newLive4GPhysicalLap();
measureLive4GPhysicalLap(lap,{valid:true,distanceToLine:10,speed:300,brake:.2,steer:-.5});
measureLive4GPhysicalLap(lap,{valid:true,distanceToLine:30,speed:360,brake:0,steer:.3});
measureLive4GPhysicalLap(lap,{valid:false,distanceToLine:900});
assert.deepEqual(summarizeLive4GPhysicalLap(lap,2),{
 lap:2,samples:2,meanLineErrorPx:20,maxLineErrorPx:30,
 meanSpeedPxS:330,meanBrake:.1,brakeActivePct:50,peakBrake:.2,
 meanAbsSteer:.4});
const scene=readFileSync('src/game/online/craftraceLiveV2BotDirector.js','utf8');
const panel=readFileSync('src/game/online/craftraceLiveV2RaceBridge.js','utf8');
assert.ok(scene.includes('if(bezierActive)measureLive4GPhysicalLap'));
assert.ok(scene.includes('bezierLapTelemetry:bot.bezierLapTelemetry.map'));
assert.ok(scene.includes('bot.bezierLapTelemetry.push'));
assert.ok(panel.includes('TELEMETRÍA FÍSICA'));
assert.ok(panel.includes('error medio a trazada objetivo'));
assert.ok(panel.includes('no equivale al desplazamiento causado exclusivamente por el dado'));
console.log('PASS DEV LIVE 4 G seat-independent pace, real per-lap physical tracking and honest telemetry label');
