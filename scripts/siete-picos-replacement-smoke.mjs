// New owner project replaces the old 7 Picos, not an enlargement of it.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import sharp from 'sharp';
import {installSietePicos,SIETE_PICOS_SOURCE,SIETE_PICOS_SHA256,sietePicosPhotoTiles}
  from './install-siete-picos-source.mjs';
const root='src/game/tracks/library/siete-picos/';
const input=fs.readFileSync(SIETE_PICOS_SOURCE);
assert.equal(crypto.createHash('sha256').update(input).digest('hex'),SIETE_PICOS_SHA256);
const magic=Buffer.from('TDR-IMAGE-PROJECT-V1\n');
assert.ok(input.subarray(0,magic.length).equals(magic));
const end=input.indexOf(10,magic.length),length=Number(input.toString('ascii',magic.length,end));
const source=JSON.parse(input.subarray(end+1,end+1+length).toString('utf8'));
assert.deepEqual([source.imageAsset.width,source.imageAsset.height],[4344,3258]);
assert.equal(source.imageAsset.type,'image/webp');
const original=source.gameTrack;
assert.equal(original.trackShape.sourceNodeCount,32);
assert.equal(original.centerline.length,898);
assert.ok(original.finishLine?.a&&original.finishLine?.b);
const result=await installSietePicos({withAssets:false});
assert.equal(result.installed,true);
assert.deepEqual(result.world,[4344,3258]);
assert.equal(result.worldScale,1);
assert.equal(result.tiles,6);
const track=JSON.parse(fs.readFileSync(root+'track.json','utf8'));
const env=JSON.parse(fs.readFileSync(root+'siete-picos.environment.json','utf8'));
assert.deepEqual([track.worldW,track.worldH],[4344,3258]);
assert.equal(track.carScale,1);
assert.equal(track.meta.hiddenFromTrackSelect,true);
assert.equal(track.trackWidth,original.trackWidth);
assert.deepEqual(track.centerline,original.centerline);
assert.equal(track.trackShape.sourceNodeCount,32);
for(const edge of ['leftEdge','rightEdge'])
  assert.deepEqual(track.trackShape[edge],original.trackShape[edge]);
assert.deepEqual([track.meta.imageNative.width,track.meta.imageNative.height],[4344,3258]);
assert.equal(track.meta.imageNative.worldScale,undefined);
assert.deepEqual(track.meta.imageNative.tiles,sietePicosPhotoTiles);
assert.equal(track.meta.sourceBundleSha256,SIETE_PICOS_SHA256);
assert.equal(track.startLine,null);
assert.ok(track.finishLine?.a&&track.finishLine?.b);
assert.equal(track.checkpoints.length,2);
assert.equal(env.coordinateSpace,'race-world');
assert.equal(env.trackId,'siete-picos');
for(const field of ['environment','surfaces','linearBarriers','collisionLines','collisionZones','canopyZones'])
  assert.deepEqual(env[field],[],'Old '+field+' must not remain');
for(const tile of sietePicosPhotoTiles){
  assert.ok(tile.width<=2048&&tile.height<=2048);
  const local='public/'+tile.assetPath;
  assert.ok(fs.existsSync(local),'Tile missing '+local);
  const m=await sharp(local).metadata();
  assert.equal(m.format,'webp');
  assert.deepEqual([m.width,m.height],[tile.width,tile.height]);
}
const base='public/assets/tracks/siete-picos/';
const photo=fs.readFileSync(base+'7-picos.webp');
assert.equal(crypto.createHash('sha256').update(photo).digest('hex'),
  crypto.createHash('sha256').update(input.subarray(end+1+length)).digest('hex'));
assert.equal(fs.existsSync(base+'7-picos-ios.webp'),false,
  'Old whole-image iOS texture must be absent');
assert.equal(fs.readFileSync('src/game/tracks/imageNativeRaceLoader.js','utf8').includes('scaledSietePicos'),false);
console.log('7 Picos UPDATED: WebP 4344x3258, 898 points, 32 Bezier nodes, 2 checkpoints, 6 tiles, 0 old collisions, natural 1:1 scale.');
