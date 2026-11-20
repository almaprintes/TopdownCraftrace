// LIVE 4 provisional laps require REAL swept passes through the finish gate.
// Advancing N nearest-path samples is telemetry, not a valid finish crossing.
import {loopPathMetrics,gateOnLoop,sampleLoopAt,crossesDirectedFinishGate}
  from '../tracks/closedCircuitGateOrder.js';

const finite=p=>Number.isFinite(Number(p?.x))&&Number.isFinite(Number(p?.y));
function syntheticGate(metrics,distance,width){
 const s=sampleLoopAt(metrics,distance),n=s.tangent,
   ux=-n.y,uy=n.x,half=width*.58;
 return {a:{x:s.x-ux*half,y:s.y-uy*half},
   b:{x:s.x+ux*half,y:s.y+uy*half},
   normal:n};
}
export function makeLive4LapGates({centerline,finishLine,checkpoints=[],trackWidth=140}={}){
 const metrics=loopPathMetrics(centerline);
 const width=Math.max(50,Number(trackWidth)||140);
 const finishMetric=finishLine?.a&&finishLine?.b
   ?gateOnLoop(metrics,finishLine):null;
 if(finishLine?.a&&finishLine?.b&&
   (!finishMetric?.hit||finishMetric.offset>Math.max(50,width*.55)))
   throw Error('LIVE 4: authored finish line does not cross the circuit');
 const start=finishMetric?.routeDistance??0;
 const finish=finishMetric
   ?{...finishLine,normal:finishMetric.tangent}
   :syntheticGate(metrics,start,width);
 const planned=[1/3,2/3].map(f=>syntheticGate(metrics,start+metrics.total*f,width));
 if(Array.isArray(checkpoints)&&checkpoints.length===2){
   const authored=checkpoints.map(g=>{
     const m=g?.a&&g?.b?gateOnLoop(metrics,g):null;
     return m?.hit?{gate:{...g,normal:m.tangent},
       distance:(m.routeDistance-start+metrics.total)%metrics.total}:null;
   });
   if(authored.every(Boolean)){
     authored.sort((a,b)=>a.distance-b.distance);
     if(authored[0].distance>metrics.total*.08&&
       authored[1].distance<metrics.total*.92&&
       authored[1].distance-authored[0].distance>metrics.total*.13){
       planned[0]=authored[0].gate;planned[1]=authored[1].gate;
     }
   }
 }
 return {gates:[...planned,finish],finishRouteDistance:start,
   usedAuthoredFinish:Boolean(finishMetric),length:metrics.total};
}
export function advanceLive4PhysicalLap(bot,tracker,now,laps){
 if(!tracker?.gates||!bot?.plannerBody)return false;
 const current={x:bot.plannerBody.x,y:bot.plannerBody.y};
 const prev=bot.lastPhysicalPosition||current;
 bot.lastPhysicalPosition=current;
 const phase=Math.min(2,Math.max(0,Number(bot.gatePhase||0)));
 const velocity=bot.plannerBody.body?.velocity;
 if(!crossesDirectedFinishGate(tracker.gates[phase],prev,current,velocity))
   return false;
 if(phase<2){bot.gatePhase=phase+1;return false;}
 // The physical car must cross CP1, CP2 and then the real finish in order.
 const elapsed=Math.max(0,now-Number(bot.lastLapAt??now));
 if(elapsed<2000)return false; // Reject repeated jitter at the same stripe.
 bot.gatePhase=0;
 bot.completedLaps++;
 bot.lapTimes.push(Math.round(elapsed));
 bot.lastLapAt=now;
 if(bot.completedLaps>=laps){
   bot.finished=true;bot.finishAt=now;
   bot.plannerBody.setVelocity?.(0,0);
 }
 return true;
}
