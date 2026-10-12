// Protect the approved Karting Tenerife environment export against truncation,
// accidental loss of photo-native geometry, or invalid user-authored collision areas.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validCollisionZone,compileCollisionZone,pointInsidePolygon} from '../src/game/environment/FreehandCollisionZones.js';

const source=JSON.parse(readFileSync('src/game/tracks/library/karting-tenerife/karting-tenerife.environment.json','utf8'));
const track=JSON.parse(readFileSync('src/game/tracks/library/karting-tenerife/track.json','utf8'));
assert.equal(source.trackId,'karting-tenerife');
assert.equal(source.version,7);
assert.equal(source.baseTrack?.locked,true);
assert.equal(source.baseTrack?.id,'karting-tenerife');
assert.deepEqual([track.worldW,track.worldH],[3344,1882]);
assert.equal(source.collisionZones.length,7);
assert.equal(source.collisionZones.reduce((acc,z)=>acc+z.points.length,0),331);
assert.equal(new Set(source.collisionZones.map(z=>z.id)).size,7);
assert.deepEqual(source.environment,[]);
assert.deepEqual(source.surfaces,[]);
assert.deepEqual(source.linearBarriers,[]);
assert.deepEqual(source.collisionLines,[]);
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
console.log('[Karting Tenerife] final Environment Studio export validated: 7 solid zones, 331 vertices, campaign preserved; centerlineHits='+midlineHits);
