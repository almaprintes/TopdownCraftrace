// Regression for the incident: all expert bots stopped during lap 2 when
// Supabase Realtime reported RED SIN ENLACE; no cars received finish times.
import assert from 'node:assert/strict';
import {advanceHostedLive4Bots} from '../src/game/online/craftraceLive4HostContinuity.js';
let ticks=0,emitted=[],posted=[],calls=0;
let finished=[];
const director={
 update(delta,now,started){
  assert.equal(started,true);
  ticks++;
  return[{seat:1,pose:{x:ticks,y:12}},{seat:2,pose:{x:ticks+4,y:12}}];
 },
 results(){return finished;}
};
const base={director,deltaMs:16.667,started:true,
 sendPose:(seat,pose)=>emitted.push({seat,pose}),
 onBotFinish:result=>{calls++;posted.push(result);}
};
for(let i=0;i<300;i++){
 const v=advanceHostedLive4Bots({...base,now:1000+i*16.667,linkReady:false});
 assert.equal(v.advanced,true);
}
assert.equal(ticks,300,'Host AI must continue through five seconds of outage');
assert.equal(emitted.length,0,'Never broadcast while link is offline');
finished=[{seat:1,elapsedMs:75000,lapTimes:[25000,25000,25000]}];
advanceHostedLive4Bots({...base,now:7000,linkReady:false});
assert.equal(posted.length,1,'Finished bot must be handed to local result handler offline');
const stateAfterOutage=ticks;
const recovered=advanceHostedLive4Bots({...base,now:8000,linkReady:true});
assert.equal(ticks,stateAfterOutage+1,'Reconnect must not reset or replace bot physics');
assert.equal(recovered.poses,2);
assert.deepEqual(emitted.map(x=>x.seat),[1,2],'Reconnected packets contain latest positions');
assert.equal(posted.at(-1).elapsedMs,75000,'Finished result survives reconnect');
assert.deepEqual(advanceHostedLive4Bots({...base,director:null,now:9000,linkReady:false}),
 {advanced:false,poses:0,finishes:0});
console.log('PASS LIVE 4 host continuity: offline movement, local result, reconnect snapshots');
