// Protect the approved Karting Tenerife environment export against truncation,
// accidental loss of photo-native geometry, or invalid user-authored collision areas.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validCollisionZone,compileCollisionZone,pointInsidePolygon} from '../src/game/environment/FreehandCollisionZones.js';
import {validCollisionLine,sampleCollisionLine} from '../src/game/environment/CollisionPenGeometry.js';

const source=JSON.parse(readFileSync('src/game/tracks/library/karting-tenerife/karting-tenerife.environment.json','utf8'));
const track=JSON.parse(readFileSync('src/game/tracks/library/karting-tenerife/track.json','utf8'));
assert.equal(source.trackId,'karting-tenerife');
assert.equal(source.version,7);
assert.equal(source.baseTrack?.locked,true);
assert.equal(source.baseTrack?.id,'karting-tenerife');
assert.deepEqual([track.worldW,track.worldH],[3344,1882]);
assert.equal(source.collisionZones.length,17);
assert.equal(source.collisionZones.reduce((acc,z)=>acc+z.points.length,0),470);
assert.equal(new Set(source.collisionZones.map(z=>z.id)).size,17);
assert.equal(source.environment.length,1);
assert.equal(source.environment[0].asset,'finish_line_checkered');
assert.equal(source.environment[0].path,'environment/finish-line-checkered-optimized.webp');
assert.deepEqual(source.surfaces,[]);
assert.deepEqual(source.linearBarriers,[]);
assert.equal(source.collisionLines.length,5);
assert.equal(source.collisionLines.reduce((sum,l)=>sum+l.nodes.length,0),16);
assert.equal(new Set(source.collisionLines.map(l=>l.id)).size,5);
for(const line of source.collisionLines){
  assert.ok(validCollisionLine(line),'Invalid finished collision pen: '+line.id);
  assert.equal(line.halfThickness,9);
  assert.ok(line.nodes.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.x<=3344&&p.y>=0&&p.y<=1882));
  assert.ok(sampleCollisionLine(line).length>2,'Pen collision must generate physics segments');
}
// The first seven approved solid zones must remain unchanged and in order.
assert.deepEqual(source.collisionZones.slice(0,7).map(z=>z.id),[
  'solid-zone-1791833900570-0','solid-zone-1791833942456-1',
  'solid-zone-1791834067825-2','solid-zone-1791834095099-3',
  'solid-zone-1791834109756-4','solid-zone-1791834240685-5',
  'solid-zone-1791834270588-6'
]);
assert.equal(source.advertising?.campaign,'default');
const solids=source.collisionZones.map(zone=>{
  assert.equal(zone.solid,true);
  assert.ok(zone.points.every(pt=>Number.isFinite(pt.x)&&Number.isFinite(pt.y)&&pt.x>=0&&pt.x<=3344&&pt.y>=0&&pt.y<=1882));
  assert.ok(validCollisionZone(zone),'invalid user-authored polygon: '+zone.id);
  const compiled=compileCollisionZone(zone);
  assert.ok(compiled);
  return compiled;
});
// Report possible midline intersections for on-device review, without altering
// any of the approved manual polygons.
let midlineHits=0;
for(const pos of track.centerline||[]){
  const p=Array.isArray(pos)?{x:pos[0],y:pos[1]}:pos;
  if(!Number.isFinite(p?.x)||!Number.isFinite(p?.y))continue;
  if(solids.some(z=>p.x>=z.minX&&p.x<=z.maxX&&p.y>=z.minY&&p.y<=z.maxY&&pointInsidePolygon(z.points,p)))midlineHits++;
}
if(midlineHits)console.warn('[Karting Tenerife] CHECK IN GAME: '+midlineHits+' centerline samples intersect authored collision areas. No polygons were modified.');
console.log('[Karting Tenerife] final Environment Studio export validated: 17 solid zones, 470 vertices, 5 Bézier walls, campaign preserved; centerlineHits='+midlineHits);
