// Validate owner-exported Environment Studio collision data and published race routing.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validCollisionLine,sampleCollisionLine} from '../src/game/environment/CollisionPenGeometry.js';

const read=path=>JSON.parse(readFileSync(path,'utf8'));
const folder='src/game/tracks/library/';
const americas=read(folder+'karting-americas/karting-americas.environment.json');
const arafo=read(folder+'rally-arafo-los-loros/rally-arafo-los-loros.environment.json');
const rally=read(folder+'rally-arafo-los-loros/track.json');
for(const [env,id] of [[americas,'karting-americas'],[arafo,'rally-arafo-los-loros']]){
  assert.equal(env.version,7,id+' must preserve the Environment Studio export schema');
  assert.equal(env.trackId,id);
  assert.equal(env.baseTrack?.id,id);
  assert.equal(env.baseTrack?.locked,true);
  assert.equal(env.repositoryPath,folder+id+'/'+id+'.environment.json');
  if(id==='karting-americas'){
    assert.equal(env.environment.length,1);
    assert.equal(env.environment[0].asset,'finish_line_checkered');
    assert.equal(env.environment[0].path,'environment/finish-line-checkered-optimized.webp');
  }else assert.deepEqual(env.environment,[]);
  assert.deepEqual(env.surfaces,[]);
  assert.deepEqual(env.linearBarriers,[]);
  assert.deepEqual(env.materials,{});
}
assert.equal(americas.collisionLines.length,8,'Keep all eight owner-authored Karting Americas pen barriers');
assert.equal(americas.collisionZones.length,0);
assert.equal(americas.collisionLines.reduce((n,line)=>n+line.nodes.length,0),72);
assert.equal(new Set(americas.collisionLines.map(line=>line.id)).size,8);
for(const line of americas.collisionLines){
  assert.equal(line.type,'collision');
  assert.equal(line.halfThickness,9);
  assert.ok(validCollisionLine(line),'All pen nodes and handles must be finite and correctly defined');
  const samples=sampleCollisionLine(line,18);
  assert.ok(samples.length>line.nodes.length,'Pen collision must compile into physics segments');
}
// 19/10 owner instruction: DELETE all 27 historical zones and install the
// single owner-authored Bézier barrier. Keep the export data lossless.
assert.equal(arafo.collisionLines.length,1,'Arafo must use exactly one owner-authored Bézier boundary');
assert.deepEqual(arafo.collisionZones,[],'No old collision zones may reappear');
assert.equal(arafo.collisionLines[0].id,'pen-collision-1792442865652-0');
const line=arafo.collisionLines[0];
assert.equal(line.type,'collision');
assert.equal(line.halfThickness,9);
assert.equal(line.nodes.length,190,'Keep every Bézier control from the owner export');
assert.ok(validCollisionLine(line),'Every point and both control handles must be finite');
const points=sampleCollisionLine(line,18);
assert.ok(points.length>1100,'The full mountain stage barrier must reach the race runtime');
const maxGap=points.slice(1).reduce((best,p,i)=>Math.max(best,Math.hypot(
  p.x-points[i].x,p.y-points[i].y)),0);
assert.ok(maxGap<40,'Bézier sampling must not create a shortcut across hairpins');
const ends=Math.hypot(points[0].x-points.at(-1).x,points[0].y-points.at(-1).y);
assert.ok(ends<20,'Authored line returns to its starting neighborhood');
const within=p=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&
  p.x>=0&&p.x<=rally.worldW&&p.y>=0&&p.y<=rally.worldH;
assert.ok(line.nodes.every(within),'The authored 190 anchors belong to the rally world');
// Authoring precision matters: do not move a wall automatically for clearance.
// The actual spawn and checkpoint gate centers, not first track polyline node,
// must have comfortable space for the car radius + wall half-thickness.
const closest=(p)=>{
  let best=Infinity;
  for(let i=1;i<points.length;i++){
    const a=points[i-1],b=points[i],dx=b.x-a.x,dy=b.y-a.y;
    const dd=dx*dx+dy*dy;
    const t=dd?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/dd)):0;
    best=Math.min(best,Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy));
  }
  return best;
};
assert.equal(rally.closed,false);assert.equal(rally.raceType,'stage');
assert.ok(closest(rally.start)>30,'Rally spawn must be clear of the new barrier');
assert.equal(rally.checkpoints.length,2);
for(const [i,gate] of rally.checkpoints.entries()){
  const midpoint={x:(gate.a.x+gate.b.x)/2,y:(gate.a.y+gate.b.y)/2};
  assert.ok(closest(midpoint)>30,'Rally checkpoint '+(i+1)+' must be clear');
}
const registry=readFileSync('src/game/tracks/environmentRegistry.js','utf8');
assert.match(registry,/import\.meta\.glob\('\.\/library\/\*\/\*\.environment\.json'/,
  'The published Environment Studio files must be included by the registry');
const runtime=readFileSync('src/game/scenes/raceEnvironmentRuntime.js','utf8');
assert.match(runtime,/isImageNativeTrackScene\(scene\)[\s\S]*?'rally-arafo-los-loros'\]\.includes/,
  'Photo-native rally must load its official Environment Studio data');
assert.match(runtime,/for\(const line of env\.collisionLines\|\|\[\]\)/);
assert.match(runtime,/const solidZones=\(env\.collisionZones\|\|\[\]\)\.map\(compileCollisionZone\)/);
assert.match(runtime,/resolveBodyAgainstSolidZones\(scene,player\)/);
assert.match(runtime,/resolveBodyAgainstSolidZones\(scene,ai\?\.body\)/);
console.log('Owner environment imports OK: 8 Americas lines; Arafo 1 owner-authored 190-node Bézier, 0 zones, spawn/2 CP clear, both runtime collision paths.');
