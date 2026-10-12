import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {installKartingTenerife} from './install-karting-tenerife-source.mjs';
import {expandCheckpointToEdges,checkpointEdgeIntersections} from '../src/game/tracks/imageNativeCheckpointWidth.js';
// Puede ejecutarse ANTES de npm ci: solo usa API nativa de Node.
const result=await installKartingTenerife({withAssets:false});
assert.deepEqual([result.worldW,result.worldH,result.points,result.nodes],[3344,1882,1038,37]);
const track=JSON.parse(readFileSync('src/game/tracks/library/karting-tenerife/track.json','utf8'));
assert.equal(track.trackWidth,140);
assert.equal(track.carScale,1);
assert.equal(track.checkpointMode,'authored');
assert.equal(track.checkpoints.length,2);
assert.equal(result.checkpointSpans.length,2);
for(let i=0;i<2;i++){
  const gate=track.checkpoints[i],span=Math.hypot(gate.b.x-gate.a.x,gate.b.y-gate.a.y);
  assert.ok(span>=result.originalCheckpointSpans[i],`CP${i+1} never shrinks`);
  const {center,unit,negative,positive}=checkpointEdgeIntersections(gate,track.trackShape);
  const start=(gate.a.x-center.x)*unit.x+(gate.a.y-center.y)*unit.y;
  const end=(gate.b.x-center.x)*unit.x+(gate.b.y-center.y)*unit.y;
  assert.ok(start<=negative.t-3 && end>=positive.t+3,`CP${i+1} must span both Bézier boundaries with safety margin`);
  assert.equal(gate.normal.x,track.checkpoints[i].normal.x,'Checkpoint travel direction remains unchanged');
  assert.deepEqual(expandCheckpointToEdges(gate,track.trackShape),gate,'Already-widened gates are stable and need no further modification');
}
assert.ok(result.checkpointSpans.some((span,i)=>span>result.originalCheckpointSpans[i]+8),
  'Wider approved strip must require extending at least one short authored CP');
// Synthetic ring: independent Bezier sides, asymmetric lane bounds, no source mutation.
const corners=coords=>coords.map(([x,y])=>({x,y,handleIn:{x,y},handleOut:{x,y}}));
const shape={version:1,closed:true,
  leftEdge:corners([[0,0],[100,0],[100,100],[0,100]]),
  rightEdge:corners([[20,20],[80,20],[80,80],[20,80]])};
const old={a:{x:50,y:7},b:{x:50,y:13},normal:{x:1,y:0}};
const expanded=expandCheckpointToEdges(old,shape);
assert.deepEqual(old,{a:{x:50,y:7},b:{x:50,y:13},normal:{x:1,y:0}},'Input authored gate stays intact');
assert.ok(Math.abs(expanded.a.y-(-4))<.05 && Math.abs(expanded.b.y-24)<.05,'Checkpoint extends to both actual borders');
assert.deepEqual(expanded.normal,old.normal,'Travel normal stays untouched');

assert.equal(track.meta?.renderMode,'image-native');
assert.equal(track.meta?.imageNative?.availability,'published');
assert.deepEqual([track.start.x,track.start.y],[2685,1211]);
const a0=track.centerline[0],a5=track.centerline[5];
const expectedR=Math.atan2(a5.y-a0.y,a5.x-a0.x);
assert.ok(Math.abs(track.start.r-expectedR)<1e-10,'Karting race start must follow the authored centerline tangent');
assert.ok(track.start.r<-1.1&&track.start.r>-1.8,'Karting race start must head toward the TOP of the photo, not right');

assert.ok(track.trackShape?.leftEdge?.length>10);
assert.ok(track.trackShape?.rightEdge?.length>10);
const beauty=readFileSync('src/game/tracks/trackBeautyLayers.generated.js','utf8');
assert.ok(beauty.includes('karting-tenerife-trackstudio-0.webp'));
assert.ok(beauty.includes('worldW: 3344, worldH: 1882'));
const env=JSON.parse(readFileSync('src/game/tracks/library/karting-tenerife/karting-tenerife.environment.json','utf8'));
assert.deepEqual(env.environment,[]);
assert.deepEqual(env.surfaces,[]);
assert.deepEqual(env.linearBarriers,[]);
console.log('Karting Tenerife oficial: 2 CP anchored and extended to actual Bézier edges, untouched source/meta and native photo 1:1 OK',result.originalCheckpointSpans,result.checkpointSpans);
