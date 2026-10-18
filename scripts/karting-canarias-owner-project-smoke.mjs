// Owner Karting Canarias photo-native circuit: pixel-exact source and safe lap gates.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {shapeIsValid,sampleShapeEdge} from '../src/game/studio/trackShapeGeometry.js';
import {makeKartingShapeMask} from '../src/game/tracks/localKartingPreview.js';
import {loopPathMetrics,gateOnLoop} from '../src/game/tracks/closedCircuitGateOrder.js';
import {describeImageNativeRace,validateImageNativeRaceDescriptor} from '../src/game/tracks/imageNativeRaceLoader.js';
import {buildOwnerKartingCanarias} from './install-karting-canarias-source.mjs';
import {KARTING_CANARIAS_WORLD_SCALE,scaleKartingCanariasRaceTrack} from '../src/game/tracks/kartingCanariasWorldScale.js';

const bytes=readFileSync('src/game/tracks/library/karting-canarias/source/trackstudio-image-1792189935586.project.json');
const project=JSON.parse(bytes.toString('utf8')),owner=project.gameTrack;
const track=JSON.parse(readFileSync('src/game/tracks/library/karting-canarias/track.json','utf8'));
const sha=b=>createHash('sha256').update(b).digest('hex');
assert.equal(bytes.length,39923,'Must archive the latest owner export, not its earlier draft');
assert.equal(sha(bytes),'dec073a892ae8e5e87193313372ae54f5126fb7d02ce92532618bdf8aad2284a');
assert.deepEqual([owner.worldW,owner.worldH,owner.centerline.length],[2048,3072,506]);
assert.equal(project.editor.nodes.length,18);
assert.ok(owner.closed&&owner.trackShape.closed&&shapeIsValid(owner.trackShape));
assert.equal(owner.finishLine,null,'Track Studio authors only a start gate for this closed circuit');
assert.ok(owner.startLine?.a&&owner.startLine?.b,'Owner-authored start gate required');
assert.equal(owner.checkpoints?.length,2,'Owner authored two sector gates');
const webp=readFileSync('public/assets/tracks/karting-canarias/karting-canarias-new.webp');
assert.equal(webp.length,project.imageAsset.size);
const rebuilt=Buffer.concat([Buffer.from('TDR-IMAGE-PROJECT-V1\n'+bytes.length+'\n'),bytes,webp]);
assert.equal(sha(rebuilt),'4327ff06e677431e4b7343f7d5b5e8bd08ea1d0645da75782a1f4afaafed5dc6',
  'Source metadata + staged image must reconstruct the exact uploaded .tdrtrack');
assert.equal(sha(webp),track.meta.sourceImageSha256);
assert.deepEqual(track,buildOwnerKartingCanarias(),'Installed track is reproducible from owner source; no hand-adjusted geometry');
assert.deepEqual(track.centerline,owner.centerline.map(p=>({...p,x:p.x*2.5,y:p.y*2.5,width:p.width*2.5})),'Preserve 506 owner-authored racing points enlarged 2.5x');
assert.deepEqual(track.trackShape.leftEdge[0].x,owner.trackShape.leftEdge[0].x*2.5);
assert.equal(track.trackShape.leftEdge.length,owner.trackShape.leftEdge.length);
assert.equal(track.trackShape.rightEdge.length,owner.trackShape.rightEdge.length);
assert.equal(track.startLine,null,'A closed lap must not activate the open rally A->B start gate');
assert.deepEqual([track.closed,track.raceType,track.checkpointMode],[true,'circuit','authored']);
assert.deepEqual([track.worldW,track.worldH],[5120,7680]);
assert.equal(track.meta.imageNative.worldScale,KARTING_CANARIAS_WORLD_SCALE);
assert.deepEqual([track.finishLine.a,track.finishLine.b],[{x:owner.startLine.a.x*2.5,y:owner.startLine.a.y*2.5},{x:owner.startLine.b.x*2.5,y:owner.startLine.b.y*2.5}],
  "The owner's start line doubles as the one and only logical lap finish");
assert.equal(track.checkpoints.length,2);
function crosses(a,b,c,d){
 const side=(p,q,r)=>(q.x-p.x)*(r.y-p.y)-(q.y-p.y)*(r.x-p.x);
 return side(a,b,c)*side(a,b,d)<0&&side(c,d,a)*side(c,d,b)<0;
}
for(const edge of [track.trackShape.leftEdge,track.trackShape.rightEdge]){
 const pts=sampleShapeEdge(edge,true,14),n=pts.length;
 for(let i=0;i<n;i++)for(let j=i+2;j<n;j++){
   if(i===0&&j===n-1)continue;
   assert.ok(!crosses(pts[i],pts[(i+1)%n],pts[j],pts[(j+1)%n]),
     'A self-crossing Bézier edge reopens the unsafe hairpin geometry');
 }
}
const mask=makeKartingShapeMask(track.trackShape,track.worldW,track.worldH);
for(const [i,p] of track.centerline.entries())
 assert.ok(mask.isOnTrack(p.x,p.y),'Owner centerline falls off the photo road at '+i);
const metrics=loopPathMetrics(track.centerline),finish=gateOnLoop(metrics,track.finishLine);
assert.ok(finish?.hit,'Finish must physically cross centerline');
const fractions=[];
for(const [i,gate] of track.checkpoints.entries()){
 const m=gateOnLoop(metrics,gate);
 assert.ok(m?.hit,'CP'+(i+1)+' must cross centerline');
 assert.ok(m.tangent.x*gate.normal.x+m.tangent.y*gate.normal.y>.98,
   'Checkpoint direction must follow driving direction');
 fractions.push(((m.routeDistance-finish.routeDistance+metrics.total)%metrics.total)/metrics.total);
}
assert.ok(fractions[0]>.1&&fractions[1]<.95&&fractions[0]+.10<fractions[1],
  'Finish, CP1 and CP2 must be encountered in correct lap order');
const descriptor=describeImageNativeRace('karting-canarias',key=>key==='karting-canarias'?track:null);
assert.equal(descriptor.type,'published');
assert.equal(descriptor.tiles.length,4);
assert.equal(descriptor.worldScale,2.5);
assert.deepEqual([descriptor.width,descriptor.height],[2048,3072]);
assert.equal(validateImageNativeRaceDescriptor(descriptor),descriptor);
const runtime=readFileSync('src/game/scenes/raceEnvironmentRuntime.js','utf8');
assert.match(runtime, /\['karting-tenerife','santa-cruz','karting-americas','karting-canarias','karting-canarias-4096','rally-arafo-los-loros'\]\.includes\(normalizeTrackKey\(scene\?\.trackKey\)\)/,
  'Official Canarias must load NEW authored collisions while excluding local photo previews');
assert.ok(runtime.includes("rebuiltCanarias?['karting-canarias-4096']"),
  'Rebuilt 4096 owner collisions must take priority over the retired 2.5x version');
console.log('Karting Canarias native-photo: owner bundle intact, 506 points, both Bézier borders nonintersecting, photo physics aligned, CP1/CP2 and one lap finish valid.');
