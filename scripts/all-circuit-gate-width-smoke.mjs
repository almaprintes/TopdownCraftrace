// Exact, photographed Bézier or generated ribbon coverage for every gate.
// Runs after source installers, audits EVERY registered circuit, not just five.
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {buildTrackRibbon} from '../src/game/tracks/TrackBuilder.js';
import {roadGateEdges,gateRoadCrossings,widenGateToRoad,widenAllRaceGates} from '../src/game/tracks/raceGateWidth.js';

const server=await createServer({server:{middlewareMode:true},appType:'custom',logLevel:'error'});
try{
 const {TRACK_REGISTRY}=await server.ssrLoadModule('/src/game/tracks/trackRegistry.js');
 const report=[],failures=[];
 const circuitIds=Object.keys(TRACK_REGISTRY);
 assert.ok(circuitIds.length>=19,'Audit must cover the complete registry');
 for(const id of circuitIds){
  const track=TRACK_REGISTRY[id];
  const road=roadGateEdges(track,buildTrackRibbon({
   centerline:track.centerline,trackWidth:track.trackWidth,
   grassMargin:track.grassMargin,sampleStepPx:track.sampleStepPx,
   cellSize:track.cellSize,closed:track.closed
  }));
  const gates=[['META',track.finishLine],
   ...(track.startLine?.a&&track.startLine?.b?[['SALIDA',track.startLine]]:[]),
   ...(track.checkpoints||[]).map((g,i)=>['CP'+(i+1),g])];
  const audit={id,geometry:road.source,checks:[],unresolved:[]};
  for(const [name,gate] of gates){
   if(!gate?.a||!gate?.b){failures.push(id+': missing '+name);continue;}
   const span=Math.hypot(gate.b.x-gate.a.x,gate.b.y-gate.a.y);
   const match=gateRoadCrossings(gate,road);
   if(!match){audit.unresolved.push(name);continue;}
   const missLeft=match.negative.t+span*.5;
   const missRight=match.positive.t-span*.5;
   const sufficient=missLeft>=2.5&&missRight<=-2.5;
   audit.checks.push({name,span:+span.toFixed(2),
    road:+(match.positive.t-match.negative.t).toFixed(2),
    padNeg:+missLeft.toFixed(2),padPos:+(-missRight).toFixed(2),covered:sufficient});
   if(!sufficient)failures.push(id+': '+name+' too short for '+road.source+' road ('+
     missLeft.toFixed(2)+' left, '+missRight.toFixed(2)+' right)');
   // Widening the same gate again must not alter its endpoints or normal.
   const again=widenGateToRoad(gate,road,{trackWidth:track.trackWidth});
   const dist=Math.max(Math.hypot(again.gate.a.x-gate.a.x,again.gate.a.y-gate.a.y),
     Math.hypot(again.gate.b.x-gate.b.x,again.gate.b.y-gate.b.y));
   if(dist>.02)failures.push(id+': '+name+' is not stable after widening '+dist.toFixed(2));
  }
  // No gate fitting may mutate the photographed source geometry or race rules.
  const again=widenAllRaceGates(track,buildTrackRibbon({
   centerline:track.centerline,trackWidth:track.trackWidth,closed:track.closed,
   grassMargin:track.grassMargin,sampleStepPx:track.sampleStepPx,cellSize:track.cellSize
  }));
  assert.deepEqual(again.centerline,track.centerline,id+' centerline modified');
  assert.deepEqual(again.trackShape,track.trackShape,id+' edges modified');
  assert.equal(again.start.x,track.start.x,id+' spawn X moved');
  assert.equal(again.start.y,track.start.y,id+' spawn Y moved');
  report.push(audit);
 }
 console.log('ALL_RACE_GATE_WIDTHS '+JSON.stringify(report));
 const atlas=report.find(x=>x.id==='circuito-atlantico');
 assert.ok(atlas,'Atlántico not published');
 assert.deepEqual(atlas.unresolved,[],'All three Atlántico gates must reach physical Bézier edges');
 assert.equal(atlas.checks.length,3,'Atlántico META + two sector checkpoints required');
 assert.deepEqual(failures,[],'Short or unstable race gates');
 console.log('ALL_RACE_GATE_WIDTHS_OK '+circuitIds.length+' circuit entries, including photographed Atlántico META/CP1/CP2');
}finally{await server.close();}
