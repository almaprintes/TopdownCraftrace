import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {crossingFraction,auditDirectedFinishTime} from "../src/game/timing/readOnlyFinishAudit.js";
const gate={a:{x:5,y:-2},b:{x:5,y:2},normal:{x:1,y:0}};
const from={x:0,y:0},to={x:10,y:0};
assert.equal(crossingFraction(gate,from,to),0.5);
assert.equal(crossingFraction(gate,to,from),null,"La dirección inversa no es válida");
assert.equal(crossingFraction(gate,{x:0,y:5},{x:10,y:5}),null);
let counted=0,maxError=0;
for(const fps of [60,30,15]){
 const step=1000/fps;
 const audit=auditDirectedFinishTime({gate,from,to,nowMs:10000,lapStartMs:0,
  frameDeltaMs:step,simulatedDeltaMs:Math.min(step,50)});
 assert.equal(audit.measurable,true);
 assert.equal(audit.reviewRequired,fps===15,"El paso físico está limitado a 50 ms");
 if(!audit.reviewRequired){
  const expected=10000-step/2;
  maxError=Math.max(maxError,Math.abs(audit.candidateLapMs-expected));
 }
 counted++;
}
for(let i=0;i<1000;i++){
 const fraction=(i+0.5)/1000,step=5+(i%42);
 const next={x:10,y:0},previous={x:5-10*fraction,y:0};
 // Distancia recorrida hasta llegar al gate / distancia total = fraction.
 const audited=auditDirectedFinishTime({gate,from:previous,to:next,nowMs:20000,
  lapStartMs:5000,frameDeltaMs:step,simulatedDeltaMs:step});
 const analytic=(5-previous.x)/(10-previous.x);
 assert.ok(Math.abs(audited.fraction-analytic)<1e-9);
 assert.ok(Math.abs(audited.candidateLapMs-(15000-(1-analytic)*step))<1e-7);
 counted++;
}
const frozen=auditDirectedFinishTime({gate,from,to,nowMs:10000,lapStartMs:0,
 frameDeltaMs:1000,simulatedDeltaMs:50});
assert.equal(frozen.reviewRequired,true);
assert.equal(frozen.candidateLapMs,null,"No inventar tiempo preciso después de congelación");
const race=readFileSync(new URL("../src/game/scenes/RaceScene.js",import.meta.url),"utf8");
assert.match(race,/auditDirectedFinishTime\(/);
assert.match(race,/if \(!IS_PROD_BUILD\)/);
assert.match(race,/this\._tdrGateTimingAudit/);
assert.match(race,/const lapTime = now - this\.timing\.lapStart/,"No cambiar marca pública");
console.log("CraftRace: auditoría pasiva de "+counted+" casos, desviación analítica "+maxError.toFixed(8)+" ms, congelación aislada OK");
