// Regression for user's requested true 2.5x physical Karting Canarias scale.
// The photo is enlarged on GPU using four original tiles, not re-encoded.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  KARTING_CANARIAS_WORLD_SCALE,
  scaleKartingCanariasRaceTrack,
  scaleKartingCanariasEnvironment
} from '../src/game/tracks/kartingCanariasWorldScale.js';
import {buildOwnerKartingCanarias} from './install-karting-canarias-source.mjs';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const source=read('src/game/tracks/library/karting-canarias/source/trackstudio-image-1792189935586.project.json').gameTrack;
const published=read('src/game/tracks/library/karting-canarias/track.json');
const exportEnv=read('src/game/tracks/library/karting-canarias/karting-canarias.environment.json');
const runtimeEnv=scaleKartingCanariasEnvironment(exportEnv);
const f=KARTING_CANARIAS_WORLD_SCALE;
assert.equal(f,2.5);
assert.deepEqual([source.worldW,source.worldH],[2048,3072]);
assert.deepEqual([published.worldW,published.worldH],[5120,7680]);
assert.deepEqual(published,buildOwnerKartingCanarias());
assert.equal(published.trackWidth,source.trackWidth*f);
assert.equal(published.carScale,1);
assert.equal(published.meta.imageNative.worldScale,f);
assert.deepEqual([published.meta.imageNative.width,published.meta.imageNative.height],[2048,3072]);
const loopLength=points=>points.reduce((sum,p,i)=>{
  const q=points[(i+1)%points.length];
  return sum+Math.hypot(p.x-q.x,p.y-q.y);
},0);
const oldL=loopLength(source.centerline),newL=loopLength(published.centerline);
assert.ok(Math.abs(newL/oldL-f)<1e-12,'Lap has not been expanded 2.5x');
assert.ok(newL>16000&&newL<17000,'Expected circa 16.3k world-unit lap');
for(const [i,p] of published.centerline.entries()){
  const q=source.centerline[i];
  assert.equal(p.x,q.x*f);assert.equal(p.y,q.y*f);
  assert.equal(p.width,q.width*f);
}
for(const key of ['leftEdge','rightEdge'])
  for(const [i,p] of published.trackShape[key].entries()){
    const q=source.trackShape[key][i];
    assert.equal(p.x,q.x*f);assert.equal(p.y,q.y*f);
    for(const h of ['handleIn','handleOut']){
      assert.equal(p[h].x,q[h].x*f);assert.equal(p[h].y,q[h].y*f);
    }
  }
for(const [key,gate] of [['start',published.start],['finishAnchor',published.finishAnchor]]){
  const src=key==='start'?source.start:source.startLine;
  if(key==='start'){
    assert.ok(Number.isFinite(gate.x)&&Number.isFinite(gate.y));
  } else {
    assert.equal(gate.x,(published.finishLine.a.x+published.finishLine.b.x)/2);
  }
}
assert.deepEqual(published.finishLine.a,{x:source.startLine.a.x*f,y:source.startLine.a.y*f});
assert.deepEqual(published.finishLine.b,{x:source.startLine.b.x*f,y:source.startLine.b.y*f});
for(let i=0;i<2;i++)
  for(const k of ['a','b']){
    assert.equal(published.checkpoints[i][k].x,source.checkpoints[i][k].x*f);
    assert.equal(published.checkpoints[i][k].y,source.checkpoints[i][k].y*f);
  }
assert.equal(runtimeEnv.collisionLines.length,5);
assert.equal(runtimeEnv.collisionZones.length,1);
for(let i=0;i<5;i++){
  const a=exportEnv.collisionLines[i],b=runtimeEnv.collisionLines[i];
  assert.equal(b.halfThickness,a.halfThickness*f);
  for(let j=0;j<a.nodes.length;j++)for(const k of ['x','y']){
    assert.equal(b.nodes[j][k],a.nodes[j][k]*f);
    assert.equal(b.nodes[j].in[k],a.nodes[j].in[k]*f);
    assert.equal(b.nodes[j].out[k],a.nodes[j].out[k]*f);
  }
}
for(const [i,p] of runtimeEnv.collisionZones[0].points.entries()){
  const q=exportEnv.collisionZones[0].points[i];
  assert.equal(p.x,q.x*f);assert.equal(p.y,q.y*f);
}
const loader=readFileSync('src/game/tracks/imageNativeRaceLoader.js','utf8');
assert.match(loader,/scene\.add\.image\(x\*worldScale,y\*worldScale,key\)/);
assert.match(loader,/sprite\.setScale\(worldScale\)/);
assert.match(loader,/scaledCanarias[\s\S]*?KARTING_CANARIAS_WORLD_SCALE/);
assert.match(loader,/desc\.tiles\)\&\&desc\.tiles\.length/); // tiled source remains pixel-authored
const environmentRuntime=readFileSync('src/game/scenes/raceEnvironmentRuntime.js','utf8');
assert.match(environmentRuntime,/scaleKartingCanariasEnvironment\(env\)/);
const zoom=readFileSync('src/game/tracks/raceCameraZoom.js','utf8');
assert.match(zoom,/KARTING_CANARIAS_ZOOM_FACTOR = 1;/);
assert.equal(scaleKartingCanariasRaceTrack(null),null);
console.log('Karting Canarias real 2.5x world: physical lap '+Math.round(oldL)+'→'+Math.round(newL)+' px, width '+source.trackWidth+'→'+published.trackWidth+', 4 GPU-scaled original tiles, authored obstacles enlarged, all cars and camera default unchanged.');
