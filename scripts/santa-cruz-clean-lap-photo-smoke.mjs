// Santa Cruz: lap timing already works, but LEGAL laps must not become
// "dirty" just because legacy procedural cells differ from the photo road.
// The only clean/dirty authority here is the authored Bézier asphalt envelope.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {makeKartingShapeMask} from '../src/game/tracks/localKartingPreview.js';
import {shapeIsValid} from '../src/game/studio/trackShapeGeometry.js';
const source=readFileSync('src/game/scenes/RaceCleanLapScene.js','utf8');
const track=JSON.parse(readFileSync('src/game/tracks/library/santa-cruz/track.json','utf8'));
assert.equal(track.meta?.renderMode,'image-native','Official Santa Cruz photo must be installed before testing clean laps');
assert.ok(shapeIsValid(track.trackShape)&&track.trackShape.closed,'Clean laps need real Bézier road bounds');
assert.ok(source.includes("this._cleanLapTrackId==='santa-cruz'"),
 'Only the reported Santa Cruz clean-lap rule should change');
assert.ok(source.includes('this._cleanLapPhotoMask.isOnTrack(x,y)'),
 'Clean detection must use real photo-road mask, not procedural generated cells');
assert.ok(source.includes('recordCompletedLapClean(this._cleanLapTrackId,clean)'),
 'Keep recorded clean-lap telemetry and rewards');
const mask=makeKartingShapeMask(track.trackShape,track.worldW,track.worldH);
const path=track.centerline||[];
assert.ok(path.length>100,'Expected full authored race road');
const hits=path.filter(p=>mask.isOnTrack(Number(p.x),Number(p.y))).length;
assert.ok(hits>=path.length*.92,
 'Source centerline deviates significantly from photographed Bézier road: '+hits+'/'+path.length);
assert.equal(mask.isOnTrack(-2,-2),false,'Leaving world must remain dirty');
assert.equal(mask.isOnTrack(track.worldW+2,track.worldH+2),false,'Outside photo stays dirty');
console.log('[santa-cruz CLEAN LAP] photo-road mask on centerline: '+hits+'/'+path.length
  +'; legal road accepted, outside rejected, time gates/physics unchanged.');
