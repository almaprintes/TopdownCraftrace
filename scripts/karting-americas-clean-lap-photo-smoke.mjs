// Karting Américas: recorded laps must use the road actually shown in the
// owner photo, not cells reconstructed from a Catmull-Rom centerline.
// Test BOTH legitimate road coverage and negative/off-road classification.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {makeKartingShapeMask} from '../src/game/tracks/localKartingPreview.js';
import {shapeIsValid} from '../src/game/studio/trackShapeGeometry.js';

const source=readFileSync('src/game/scenes/RaceCleanLapScene.js','utf8');
const track=JSON.parse(readFileSync('src/game/tracks/library/karting-americas/track.json','utf8'));
assert.equal(track.meta?.renderMode,'image-native');
assert.equal(track.closed,true);
assert.ok(track.centerline?.length>=700,'must use the published 730-node owner race route');
assert.ok(shapeIsValid(track.trackShape)&&track.trackShape.closed,'authored Bézier lane required');
assert.ok(source.includes("this._cleanLapTrackId==='karting-americas'"),
 'the actual Karting Américas photo lane must be an eligible clean-lap authority');
assert.match(source,/this\._cleanLapPhotoMask\.isOnTrack\(x,y\)/,
 'clean laps use authored road boundary, not rebuilt Catmull-Rom cells');
assert.match(source,/recordCompletedLapClean\(this\._cleanLapTrackId,clean\)/,
 'keep genuine rewards and clean-lap statistics');
assert.match(source,/const valid=row\.valid!==false&&row\.invalid!==true/,
 'do not bypass the normal lap validity or checkpoint conditions');
assert.match(source,/if\(!insidePhotoRoad\)this\._currentLapClean=false/,
 'going off authored asphalt must still invalidate the lap');
const mask=makeKartingShapeMask(track.trackShape,track.worldW,track.worldH);
const coverage=track.centerline.filter(p=>mask.isOnTrack(Number(p.x),Number(p.y))).length;
assert.ok(coverage>=track.centerline.length*.90,
 'too much of authored centerline lies outside photo asphalt: '+coverage+'/'+track.centerline.length);
assert.equal(mask.isOnTrack(-2,-2),false);
assert.equal(mask.isOnTrack(track.worldW+2,track.worldH+2),false);
assert.equal(mask.isOnTrack(0,0),false,'background beyond photo road stays dirty');
console.log('[karting-americas CLEAN LAP] authored photo lane aligned '+coverage+'/'+track.centerline.length+
 '; off-road remains dirty; timing, two ordered CPs and collisions untouched.');
