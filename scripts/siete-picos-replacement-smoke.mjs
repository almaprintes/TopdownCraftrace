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
// This is the owner's NEW v8 export for the NEW 4344x3258 photo; no legacy walls.
assert.equal(env.version,8);
assert.deepEqual(env.collisionLines.map(line=>line.nodes.length),[45,42]);
assert.deepEqual(env.collisionLines.map(line=>line.halfThickness),[9,9]);
assert.deepEqual(env.collisionLines.map(line=>line.type),['collision','collision']);
assert.deepEqual(env.collisionLines.map(line=>line.id),[
 'pen-collision-1792886397520-0','pen-collision-1792886825857-1']);
assert.equal(env.environment.length,1);
assert.deepEqual(env.environment[0],{
 asset:'finish_line_checkered',path:'environment/finish-line-checkered-optimized.webp',
 x:2057.21,y:2892.54,rotation:1.55388,displayWidth:108.41,
 flipX:false,flipY:false,z:12});
for(const field of ['surfaces','linearBarriers','collisionZones','canopyZones'])
  assert.deepEqual(env[field],[],'Unexpected imported '+field);
assert.equal(env.collisionLines[0].nodes[0].x,2055.8750047975655);
assert.equal(env.collisionLines[1].nodes[0].y,2829.5176167950003);
assert.equal(env.collisionLines[0].nodes[1].in.x,2395.007608538034);
assert.equal(env.collisionLines[1].nodes[1].out.x,2555.2641344158565);
assert.equal(env.collisionLines[0].nodes.at(-1).x,2041.4681829146336);
assert.equal(env.collisionLines[1].nodes.at(-1).x,2046.1371463603643);
for(const line of env.collisionLines){
  for(const node of line.nodes){
    for(const point of [node,node.in,node.out]){
      assert.ok(Number.isFinite(point.x)&&Number.isFinite(point.y),
        'Non-finite Bezier collision point');
      assert.ok(point.x>=0&&point.x<=4344&&point.y>=0&&point.y<=3258,
        'Collision curves must fit the current 7 Picos race world');
    }
  }
}
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
console.log('7 Picos UPDATED: WebP 4344x3258, 898 points, 32 Bezier nodes, 2 checkpoints, 6 tiles, 87 new collision nodes, 1 finish decal, natural 1:1 scale.');
