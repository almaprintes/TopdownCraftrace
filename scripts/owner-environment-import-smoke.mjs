// Validate owner-exported Environment Studio collision data and published race routing.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validCollisionLine,sampleCollisionLine} from '../src/game/environment/CollisionPenGeometry.js';
import {validCollisionZone,compileCollisionZone,pointInsidePolygon} from '../src/game/environment/FreehandCollisionZones.js';

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
assert.equal(arafo.collisionLines.length,0);
assert.equal(arafo.collisionZones.length,27,'Preserve all 27 owner-authored Arafo solid areas');
assert.equal(arafo.collisionZones.reduce((n,zone)=>n+zone.points.length,0),484);
assert.equal(new Set(arafo.collisionZones.map(zone=>zone.id)).size,27);
const compiled=arafo.collisionZones.map(zone=>{
  assert.equal(zone.solid,true);
  assert.ok(validCollisionZone(zone),'Solid collision polygon cannot self-intersect or have invalid geometry: '+zone.id);
  const shape=compileCollisionZone(zone);
  assert.ok(shape,'Every authored area must be compilable for the game runtime');
  return shape;
});
// The open rally's centerline and its start/finish must remain drivable.
// No automatic clipping or rescaling of hand-authored obstacles.
assert.equal(rally.closed,false);
assert.equal(rally.raceType,'stage');
for(const [i,p] of rally.centerline.entries()){
  if(i%10!==0 && i!==rally.centerline.length-1)continue;
  assert.ok(!compiled.some(zone=>pointInsidePolygon(zone.points,p)),
    'Authored zone covers the rally racing line at point '+i);
}
for(const p of [rally.start,rally.centerline[0],rally.centerline.at(-1)]){
  assert.ok(!compiled.some(zone=>pointInsidePolygon(zone.points,p)),
    'Rally start or end is inside a solid zone');
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
console.log('Owner environment imports OK: 8 Karting Americas pen lines, 27 Arafo solid zones, 484 vertices, both runtime collision paths, open rally centerline clear.');
