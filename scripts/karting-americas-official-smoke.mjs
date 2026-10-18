import assert from 'node:assert/strict';
import fs from 'node:fs';
import sharp from 'sharp';
import {execFileSync} from 'node:child_process';
import {loopPathMetrics,gateOnLoop,orderClosedCircuitGates,
  alignedPaddockFinishGate,crossesDirectedFinishGate
} from '../src/game/tracks/closedCircuitGateOrder.js';
const track=JSON.parse(fs.readFileSync('src/game/tracks/library/karting-americas/track.json','utf8'));
const environment=JSON.parse(fs.readFileSync('src/game/tracks/library/karting-americas/karting-americas.environment.json','utf8'));
assert.equal(track.name,'KARTING AMÉRICAS');
assert.equal(track.worldW,2862);assert.equal(track.worldH,3435);
assert.equal(track.centerline.length,730);
assert.equal(track.trackShape.leftEdge.length,27);
assert.equal(track.trackShape.rightEdge.length,27);
assert.equal(track.checkpoints.length,2);
assert.equal(track.closed,true);
assert.equal(track.raceType,'circuit');
assert.equal(track.startLine,null,'Closed circuit must never be classified as an open rally stage');
const metrics=loopPathMetrics(track.centerline);
const finishMetric=gateOnLoop(metrics,track.finishLine);
assert.ok(finishMetric?.hit,'Finish line must cross the driving centerline');
const progress=track.checkpoints.map((g,i)=>{
 const m=gateOnLoop(metrics,g);
 assert.ok(m?.hit,'Checkpoint '+(i+1)+' must physically cross the route');
 assert.ok(m.tangent.x*g.normal.x+m.tangent.y*g.normal.y>.98,'Checkpoint '+(i+1)+' direction must match forward travel');
 return (m.routeDistance-finishMetric.routeDistance+metrics.total)%metrics.total;
});
assert.ok(progress[0]>metrics.total*.05&&progress[1]<metrics.total*.95,
  'Checkpoints must sit after and before the finish, respectively');
assert.ok(progress[0]+metrics.total*.10<progress[1],'CP1 must be crossed before CP2');
const forwardAtFinish=finishMetric.tangent.x*track.finishLine.normal.x+
 finishMetric.tangent.y*track.finishLine.normal.y;
assert.ok(forwardAtFinish>.98,'Finish direction must permit crossing in the actual race direction');
// Paddock has a painted stripe collinear with META, but physically outside
// the short original racing-lane gate. It must count as the same lap finish,
// without modifying the painted line, CP1/CP2 or the original track image.
const pit=track.meta.paddockFinishLine;
assert.ok(pit?.a&&pit?.b&&pit?.normal,'Paddock logical finish gate must exist');
const expectedPaddock=alignedPaddockFinishGate(track.finishLine,track.trackWidth);
assert.deepEqual(pit,expectedPaddock,'Paddock gate must align with original finish axis');
const seg=v=>({x:v.b.x-v.a.x,y:v.b.y-v.a.y});
const pitVec=seg(pit),mainVec=seg(track.finishLine);
assert.ok(Math.hypot(pitVec.x,pitVec.y)>Math.hypot(mainVec.x,mainVec.y)+track.trackWidth*.5,
 'Paddock logical finish must reach outside the main racing lane');
const length=Math.hypot(pitVec.x,pitVec.y),ux=pitVec.x/length,uy=pitVec.y/length;
const offset=(Math.hypot(mainVec.x,mainVec.y)+Math.hypot(pitVec.x,pitVec.y))*.25;
const mid={x:(pit.a.x+pit.b.x)/2,y:(pit.a.y+pit.b.y)/2};
const n=pit.normal;
const padPoint={x:mid.x+ux*offset,y:mid.y+uy*offset};
const before={x:padPoint.x-n.x*30,y:padPoint.y-n.y*30};
const after={x:padPoint.x+n.x*30,y:padPoint.y+n.y*30};
const forward={x:n.x*200,y:n.y*200};
assert.ok(crossesDirectedFinishGate(pit,before,after,forward),
 'Forward crossing at paddock stripe must count');
assert.ok(!crossesDirectedFinishGate(track.finishLine,before,after,forward),
 'The original narrow meta did not cover the painted paddock lane');
assert.ok(!crossesDirectedFinishGate(pit,after,before,{x:-forward.x,y:-forward.y}),
 'Wrong-way paddock crossings must be ignored');
assert.ok(!crossesDirectedFinishGate(pit,before,before,forward),
 'Stopping on the line must not add phantom laps');
const raceSource=fs.readFileSync('src/game/scenes/RaceScene.js','utf8');
assert.ok(raceSource.includes('crossesDirectedFinishGate('));
assert.ok(raceSource.includes("this.track?.meta?.meta?.trackId === 'karting-americas'"),
 'Paddock gate must be exclusive to Americas');
assert.ok(raceSource.includes("if ((this._cpState || 0) === 2)"),
 'Paddock crossing must remain gated by both ordered checkpoints');

const startForward={x:Math.cos(track.start.r),y:Math.sin(track.start.r)};
assert.ok(startForward.x*track.finishLine.normal.x+startForward.y*track.finishLine.normal.y>.2);
// Regression: authored CP numbering can be reversed compared with race order;
// correct it by actual distance around the closed centerline, not array index.
const reordered=orderClosedCircuitGates(track.centerline,track.finishLine,
 [...track.checkpoints].reverse().map(g=>({...g,normal:{x:-g.normal.x,y:-g.normal.y}})),
 {baseWidth:track.trackWidth});
assert.ok(reordered.checkpoints.every((g,i)=>
 Math.hypot(g.a.x-track.checkpoints[i].a.x,g.a.y-track.checkpoints[i].a.y)<.00001),
 'Reversed authored checkpoint order/normals must be repaired without changing geometry');
const area=track.centerline.reduce((sum,a,i)=>{const b=track.centerline[(i+1)%track.centerline.length];return sum+a.x*b.y-b.x*a.y;},0);
assert.ok(area>0,'Karting Américas must traverse clockwise');
assert.equal(track.meta.raceTravelDirection,'clockwise');
const midpoint={x:(track.finishLine.a.x+track.finishLine.b.x)/2,y:(track.finishLine.a.y+track.finishLine.b.y)/2};
assert.ok(Math.hypot(track.start.x-midpoint.x,track.start.y-midpoint.y)<140,'Start far from finish');
assert.ok(Math.cos(track.start.r)*track.finishLine.normal.x+Math.sin(track.start.r)*track.finishLine.normal.y>0,'Incorrect starting orientation');
assert.equal(track.checkpointMode,'authored');
assert.ok(track.start&&track.finishLine?.a&&track.finishLine?.b);
assert.equal(track.meta.imageNative.availability,'published');
assert.equal(track.meta.imageNative.tiles.length,6);
assert.equal(environment.trackId,'karting-americas');
assert.equal(environment.collisionLines.length,8);
assert.equal(environment.collisionLines.reduce((n,l)=>n+l.nodes.length,0),72,'Use the owner\'s updated 72-node export');
const unlocks=fs.readFileSync('src/game/tracks/trackUnlocks.js','utf8');
assert.ok(unlocks.includes("'karting-americas'"),'New track must be published and unlocked');
const selector=fs.readFileSync('src/game/scenes/TrackGarageFixedScene.js','utf8');
assert.ok(selector.includes('getTrackKeys().map(k=>createTrack(k))'),'New track must appear normally');
const registry=fs.readFileSync('src/game/tracks/trackRegistry.js','utf8');
assert.ok(registry.includes("import.meta.glob('./library/*/track.json'"));
assert.ok(!registry.includes('if(trackId===AMERICAS)'),'Old device drafts must not override official track');
const race=fs.readFileSync('src/game/scenes/raceEnvironmentRuntime.js','utf8');
assert.ok(race.includes("'karting-americas','karting-canarias','karting-canarias-4096','rally-arafo-los-loros'].includes(normalizeTrackKey(scene?.trackKey))"),'Published photo-native environments must include the rebuilt Canarias 4096 and Américas');
const editor=fs.readFileSync('src/game/scenes/EnvironmentBuilderRealTrackCleanScene.js','utf8');
assert.ok(editor.includes("native?.availability==='published'&&Array.isArray(native.tiles)"));
for(const tile of track.meta.imageNative.tiles){
 const file='public/'+tile.assetPath;
 assert.ok(fs.existsSync(file),'Missing photo tile '+file);
 const m=await sharp(file).metadata();
 assert.equal(m.format,'webp');
 assert.equal(m.width,tile.width);assert.equal(m.height,tile.height);
 assert.ok(tile.width<=2048&&tile.height<=2048);
}
const master=await sharp('public/'+track.meta.imageNative.assetPath).metadata();
assert.equal(master.format,'webp');assert.equal(master.width,2862);assert.equal(master.height,3435);
for(const file of ['scripts/install-karting-americas-source.mjs','src/game/tracks/trackRegistry.js','src/game/scenes/raceEnvironmentRuntime.js'])
 execFileSync(process.execPath,['--check',file],{stdio:'pipe'});
console.log('KARTING AMÉRICAS OFFICIAL: circuit stays closed, no phantom rally start, ordered reachable CP1/CP2, 1:1 photo, six WebP tiles, 8 barriers OK',JSON.stringify({checkpointFractions:progress.map(x=>Number((x/metrics.total).toFixed(3)))}));
