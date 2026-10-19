// Rebuilt Karting Canarias 4096: award CLEAN laps by the owner-authored
// Bézier photo-road, never by procedurally reconstructed Catmull-Rom cells.
// Installation runs before this test in the Pages workflow.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {makeKartingShapeMask} from '../src/game/tracks/localKartingPreview.js';
import {shapeIsValid} from '../src/game/studio/trackShapeGeometry.js';

const track=JSON.parse(readFileSync('src/game/tracks/library/karting-canarias-4096/track.json','utf8'));
const race=readFileSync('src/game/scenes/RaceCleanLapScene.js','utf8');
assert.equal(track.meta?.renderMode,'image-native','Only native photographic Canarias is active');
assert.equal(track.meta?.trackId,'karting-canarias-4096');
assert.deepEqual([track.worldW,track.worldH],[4096,6144],'No x2.5 scaling on new track');
assert.equal(track.centerline?.length,590,'Use the newly rebuilt owner route');
assert.equal(track.closed,true);
assert.ok(shapeIsValid(track.trackShape)&&track.trackShape.closed===true,
 'The true authored Bézier lane, not inferred cells, must be available');
assert.ok(race.includes("this._cleanLapTrackId==='karting-canarias-4096'"),
 'Canarias must use the photo-road clean-lap check like Américas');
for(const id of ['santa-cruz','karting-americas'])
 assert.ok(race.includes("this._cleanLapTrackId==='"+id+"'"),
  'The already-fixed circuit '+id+' must retain its authored-road check');
assert.match(race,/this\._cleanLapPhotoMask\.isOnTrack\(x,y\)/,
 'Sample actual Bézier asphalt at each clean-lap check');
assert.match(race,/if\(!insidePhotoRoad\)this\._currentLapClean=false/,
 'Leaving the genuine track must still make the lap dirty');
assert.match(race,/const valid=row\.valid!==false&&row\.invalid!==true/,
 'Never bypass the normal lap/CP validation');
assert.match(race,/recordCompletedLapClean\(this\._cleanLapTrackId,clean\)/,
 'Keep progression, reward and clean-lap telemetry intact');
const mask=makeKartingShapeMask(track.trackShape,track.worldW,track.worldH);
const route=track.centerline;
const pointsOnRoad=route.filter(p=>mask.isOnTrack(Number(p.x),Number(p.y))).length;
assert.ok(pointsOnRoad>=route.length*.90,
 'Canarias Bézier road deviates from owner centerline: '+pointsOnRoad+'/'+route.length);
for(const p of [{x:-1,y:-1},{x:track.worldW+1,y:track.worldH+1},{x:0,y:0}])
 assert.equal(mask.isOnTrack(p.x,p.y),false,
  'Outside the photo asphalt must remain dirty: '+JSON.stringify(p));
console.log('[CANARIAS 4096 CLEAN LAP] '+pointsOnRoad+'/'+route.length+
 ' genuine photo-road points accepted; off-road still dirty, 2 CP gates untouched.');
