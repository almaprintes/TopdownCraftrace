import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createTrackShape} from '../src/game/studio/trackShapeGeometry.js';
import {buildTrackRacingLineModel} from '../src/game/ai/trackRacingLinePlanner.js';
import {normalizeAiBezierLine,createAiBezierFromTrackNodes,sampleAiBezierLine,
 moveAiBezierPart} from '../src/game/studio/trackAiBezierLine.js';
import {buildBezierAiRacingLineModel,buildBezierDieVariant}
 from '../src/game/ai/trackBezierAiRacingLinePlanner.js';
import {AI_ELO_PILOTS,eloDieProbabilities,rollEloAiDie,updateAiEloRace}
 from '../src/game/ai/craftraceAiEloLeague.js';

const N=16,C={x:800,y:800},R=380,delta=2*Math.PI/N;
const h=R*4/3*Math.tan(delta/4);
const nodes=Array.from({length:N},(_,i)=>{
 const a=i*delta,x=C.x+R*Math.cos(a),y=C.y+R*Math.sin(a);
 const tx=-Math.sin(a)*h,ty=Math.cos(a)*h;
 return{x,y,handleIn:{x:x-tx,y:y-ty},
  handleOut:{x:x+tx,y:y+ty},width:170};
});
const shape=createTrackShape(nodes,170,true);
const baseline=buildTrackRacingLineModel({
 raceCenterline:nodes,trackWidth:170
},{apexCommitment:.22});
assert.ok(baseline.valid);
const bezier=createAiBezierFromTrackNodes(nodes,N);
assert.equal(bezier.nodes.length,N);
assert.ok(sampleAiBezierLine(bezier).length>100);
assert.ok(normalizeAiBezierLine(bezier));
const moved=moveAiBezierPart(bezier,0,'anchor',
 {x:bezier.nodes[0].x+2,y:bezier.nodes[0].y});
assert.ok(moved&&moved.nodes[0].x===bezier.nodes[0].x+2);
assert.equal(bezier.nodes[0].x,nodes[0].x);
const target=buildBezierAiRacingLineModel(baseline,bezier,shape,
 {worldW:1600,worldH:1600},{carRadius:10});
assert.ok(target.report.active,
 'A gentle authored ring must be drivable: '+JSON.stringify(target.report));
assert.equal(target.report.mode,'bezier');
assert.equal(target.model.racingLine.length,baseline.racingLine.length);
const turned=JSON.parse(JSON.stringify(bezier));
turned.nodes.push(...turned.nodes.splice(0,5));
const sameLoop=buildBezierAiRacingLineModel(baseline,turned,shape,
 {worldW:1600,worldH:1600},{carRadius:10});
assert.ok(sameLoop.report.active,
 'Closed Bézier must validate regardless of which knot the author selected first: '+
 JSON.stringify(sameLoop.report));
const movedOutside=JSON.parse(JSON.stringify(bezier));
for(const p of movedOutside.nodes){
 const dx=p.x-C.x,dy=p.y-C.y;
 p.x=C.x+dx*1.7;p.y=C.y+dy*1.7;
 p.handleIn.x=C.x+(p.handleIn.x-C.x)*1.7;
 p.handleIn.y=C.y+(p.handleIn.y-C.y)*1.7;
 p.handleOut.x=C.x+(p.handleOut.x-C.x)*1.7;
 p.handleOut.y=C.y+(p.handleOut.y-C.y)*1.7;
}
const unsafeLoop=buildBezierAiRacingLineModel(baseline,movedOutside,shape,
 {worldW:1600,worldH:1600},{carRadius:10});
assert.equal(unsafeLoop.report.active,false);
assert.notEqual(unsafeLoop.report.reason,'start-mismatch',
 'Unsafe trajectories must not be misdiagnosed as start alignment');

const exact=buildBezierDieVariant(target.model,6,0,shape,{worldW:1600,worldH:1600});
assert.strictEqual(exact,target.model);
const varied=buildBezierDieVariant(target.model,2,1,shape,
 {worldW:1600,worldH:1600},{carRadius:10});
assert.equal(varied.racingLine.length,exact.racingLine.length);
assert.ok(varied.metrics.authoredBezier);
assert.ok(varied.racingLine.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)));
const bad=normalizeAiBezierLine({...bezier,closed:false});
assert.equal(bad,null);

assert.equal(AI_ELO_PILOTS.length,16);
assert.equal(new Set(AI_ELO_PILOTS.map(p=>p.id)).size,16);
for(const elo of [900,1300,1800]){
 const probs=eloDieProbabilities(elo);
 assert.equal(probs.length,6);
 assert.ok(Math.abs(probs.reduce((a,b)=>a+b,0)-1)<1e-10);
}
assert.ok(eloDieProbabilities(1800)[5]>eloDieProbabilities(900)[5]);
assert.ok(eloDieProbabilities(900)[0]>eloDieProbabilities(1800)[0]);
assert.equal(rollEloAiDie(1300,()=>0),1);
assert.equal(rollEloAiDie(1300,()=>.999999),6);
const players=AI_ELO_PILOTS.slice(0,4);
const finishers=players.map((p,i)=>({id:p.id,elapsedMs:60000+i*1000}));
const ignored=updateAiEloRace(players,finishers,{homologated:false});
assert.equal(ignored.updated,false);
const rated=updateAiEloRace(players,finishers,{homologated:true,k:24});
assert.equal(rated.updated,true);
assert.ok(Math.abs(Object.values(rated.delta).reduce((a,b)=>a+b,0))<1e-7);
assert.ok(rated.league.some((p,i)=>p.elo!==players[i].elo));
const editor=readFileSync('src/game/studio/trackStudioLabChrome.js','utf8');
const director=readFileSync('src/game/online/craftraceLiveV2BotDirector.js','utf8');
const studio=readFileSync('src/game/scenes/TrackStudioScene.js','utf8');
assert.ok(editor.includes('TRAZADA MAESTRA · BÉZIER'));
assert.ok(studio.includes('installTrackStudioAiBezier(this)'));
assert.ok(director.includes('buildBezierAiRacingLineModel('));
assert.ok(director.includes('_bezierProfileForDie('));
assert.ok(director.includes('if((guidedActive||bezierActive)&&lapPassed)'));
assert.ok(!director.includes('updateAiEloRace('),
 'DEV provisional race must not change official Elo ratings');
console.log('PASS Track Studio authored Bézier, masked G variants, and isolated 16-AI Elo league');
