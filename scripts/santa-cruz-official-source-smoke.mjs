// Santa Cruz source-install contract. Preserves legacy until source arrives.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import path from 'node:path';
const src='src/game/tracks/library/santa-cruz/source/Santa-Cruz-x3-nitido.tdrtrack';
const track=JSON.parse(fs.readFileSync('src/game/tracks/library/santa-cruz/track.json','utf8'));
if(!fs.existsSync(src)){
  assert.notEqual(track.meta?.renderMode,'image-native','Without source, legacy Santa Cruz must be unchanged');
  console.log('[santa-cruz] source pending; legacy retained');
}else{
  assert.equal(track.meta.renderMode,'image-native');
  assert.equal(track.worldW,3072);assert.equal(track.worldH,4608);
  assert.equal(track.meta.imageNative.availability,'published');
  assert.equal(track.meta.imageNative.tiles.length,6);
  assert.equal(track.checkpointMode,'authored');
  assert.equal(track.checkpoints.length,2);
  assert.equal(track.start.r,Math.atan2(track.centerline[6].y-track.centerline[0].y,
                                        track.centerline[6].x-track.centerline[0].x));
  for(const tile of track.meta.imageNative.tiles){
    assert.ok(fs.existsSync(path.join('public',tile.assetPath)),tile.assetPath);
    assert.equal(tile.width,1536);assert.equal(tile.height,1536);
  }
  const env=JSON.parse(fs.readFileSync('src/game/tracks/library/santa-cruz/santa-cruz.environment.json','utf8'));
  assert.equal(env.trackId,'santa-cruz');
  assert.ok(Array.isArray(env.collisionLines));assert.ok(Array.isArray(env.collisionZones));
  assert.equal(env.environment.length,0,'Do not overlay old Santa Cruz props on photo');
  // Colliders are exported in photo-pixel coordinates; no old 1900×2900
  // geometry or visual assets may leak into the new Santa Cruz.
  const authored=JSON.parse(fs.readFileSync('src/game/tracks/library/santa-cruz/source/santa-cruz-photo.environment.json','utf8'));
  assert.deepEqual(env.collisionLines,authored.collisionLines,
    'Every authored Bézier handle and position must survive installation unchanged');
  assert.deepEqual(env.collisionZones,authored.collisionZones);
  assert.equal(env.collisionLines.length,4,'Four authored wall boundaries expected');
  assert.equal(env.collisionLines.reduce((n,l)=>n+l.nodes.length,0),54,'All 54 authored nodes preserved');
  const {validCollisionLine,sampleCollisionLine}=await import('../src/game/environment/CollisionPenGeometry.js');
  for(const line of env.collisionLines){
    assert.ok(validCollisionLine(line),line.id);
    assert.equal(line.halfThickness,9,'Authored wall thickness preserved');
    const samples=sampleCollisionLine(line);
    assert.ok(samples.length>line.nodes.length,'Bézier wall must be sampled to collision segments');
    for(const p of samples){
      assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.x<=3072&&p.y>=0&&p.y<=4608,
        'Wall curve must remain within photographic world bounds');
    }
  }
  console.log('[santa-cruz] source, tiles, native metadata and collision project OK');
}
