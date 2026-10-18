// Regression for the five Environment Studio projects delivered by the owner.
// Physical barriers and the decorative finish decals are intentionally distinct.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validCollisionLine,sampleCollisionLine} from '../src/game/environment/CollisionPenGeometry.js';
import {validCollisionZone,compileCollisionZone} from '../src/game/environment/FreehandCollisionZones.js';
import {scaleAtlanticoEnvironment,ATLANTICO_WORLD_SCALE} from '../src/game/tracks/atlanticoWorldScale.js';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const root='src/game/tracks/library/';
const entries=[
  ['karting-tenerife','karting-tenerife/karting-tenerife.environment.json',5,17,3344,1882],
  ['karting-canarias-4096','karting-canarias-4096/karting-canarias-4096.environment.json',5,1,4096,6144],
  ['circuito-atlantico','track01/track01.environment.json',1,2,4344*.70,3258*.70],
  ['karting-americas','karting-americas/karting-americas.environment.json',8,0,2862,3435],
  ['santa-cruz','santa-cruz/santa-cruz.environment.json',4,0,3072,4608]
];
let totalLines=0,totalZones=0;
for(const [id,rel,lines,zones,w,h] of entries){
 const env=read(root+rel);
 assert.equal(env.version,7,id+' version');
 assert.equal(env.trackId,id,id+' identity');
 assert.equal(env.baseTrack?.id,id,id+' base track');
 assert.equal(env.baseTrack?.locked,true,id+' locked base');
 assert.equal(env.repositoryPath,root+rel,id+' canonical installation path');
 assert.equal(env.environment.length,1,id+' finish marking only');
 const decal=env.environment[0];
 assert.equal(decal.asset,'finish_line_checkered',id+' checkered line');
 assert.equal(decal.path,'environment/finish-line-checkered-optimized.webp',id+' lightweight WebP');
 assert.ok(Number.isFinite(decal.x)&&Number.isFinite(decal.y)&&decal.x>=0&&decal.x<=w&&decal.y>=0&&decal.y<=h);
 assert.ok(Number.isFinite(decal.rotation)&&Number.isFinite(decal.displayWidth)&&decal.displayWidth>0);
 assert.deepEqual(env.surfaces,[],id+' no old asphalt overlay');
 assert.deepEqual(env.linearBarriers,[],id+' no obsolete modular barriers');
 assert.deepEqual(env.materials,{},id+' no obsolete raster materials');
 assert.equal(env.collisionLines.length,lines,id+' Bézier collision count');
 assert.equal(env.collisionZones.length,zones,id+' solid collision zones count');
 assert.equal(new Set(env.collisionLines.map(x=>x.id)).size,lines,id+' unique lines');
 assert.equal(new Set(env.collisionZones.map(x=>x.id)).size,zones,id+' unique zones');
 for(const line of env.collisionLines){
   assert.ok(validCollisionLine(line),id+' invalid collision line '+line.id);
   assert.ok(sampleCollisionLine(line,18).length>=2,id+' collision line did not compile');
   for(const node of line.nodes)
    for(const point of [node,node.in,node.out])
     assert.ok(point&&Number.isFinite(point.x)&&Number.isFinite(point.y)
      &&point.x>=0&&point.x<=w&&point.y>=0&&point.y<=h,id+' pen exceeds world '+line.id);
 }
 for(const zone of env.collisionZones){
   assert.equal(zone.solid,true,id+' solid zone flag');
   assert.ok(validCollisionZone(zone),id+' invalid solid polygon '+zone.id);
   assert.ok(compileCollisionZone(zone),id+' cannot compile solid area '+zone.id);
   for(const point of zone.points)
    assert.ok(Number.isFinite(point.x)&&Number.isFinite(point.y)&&point.x>=0&&point.x<=w
      &&point.y>=0&&point.y<=h,id+' solid zone out of bounds '+zone.id);
 }
 totalLines+=lines;totalZones+=zones;
}
assert.deepEqual([totalLines,totalZones],[23,20]);
// Original 4344x3258 Atlántico export was authored before DEV 1.2.275
// coordinate-space tagging; convert only once to the approved 70%-world.
const at=read(root+'track01/track01.environment.json');
const original=read(root+'track01/source/circuito-atlantico-owner-original.environment.json');
assert.equal(original.coordinateSpace,undefined);
assert.equal(at.coordinateSpace,'race-world');
assert.equal(ATLANTICO_WORLD_SCALE,.7);
const expected=scaleAtlanticoEnvironment(original);
for(const k of ['environment','collisionLines','collisionZones'])
  assert.deepEqual(at[k],expected[k],'Atlántico owner coordinates incorrectly transformed: '+k);
const tf=read(root+'karting-tenerife/karting-tenerife.environment.json');
assert.equal(tf.advertising?.campaign,'default','Preserve Tenerife ads when owner JSON omits advertising');
const sc=read(root+'santa-cruz/santa-cruz.environment.json');
const scSource=read(root+'santa-cruz/source/santa-cruz-photo.environment.json');
assert.deepEqual(sc,scSource,'Santa Cruz installer source must not overwrite the uploaded finish line');
const runtime=readFileSync('src/game/scenes/raceEnvironmentRuntime.js','utf8');
assert.ok(runtime.includes("'karting-canarias-4096','rally-arafo-los-loros'"));
assert.ok(runtime.includes("rebuiltCanarias?['karting-canarias-4096']"),'Native 4096 must win over 2.5x legacy project');
assert.ok(runtime.includes("env.coordinateSpace==='race-world'?env:scaleAtlanticoEnvironment(env)"),
 'Runtime must not scale original Atlántico export twice');
assert.ok(runtime.includes("if(!String(item?.path||'').includes('environment/barriers/'))return"),
 'Finish decal must not become a collider');
console.log('OWNER FIVE ENVIRONMENTS OK: 5 finish lines; 23 Bézier pen lines; 20 solid zones; Canarias native 4096; Atlántico 70% once; Santa Cruz installer; Tenerife ads.');
