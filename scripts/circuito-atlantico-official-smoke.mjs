// New photo-native Atlántico is staged, not faked. Without owner's binary,
// classic Atlántico must remain untouched; after upload, exact authored photo,
// racing geometry and checkpoint positions must publish as a closed lap track.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import sharp from 'sharp';
import {
  ATLANTICO_SOURCE,ATLANTICO_TARGET,ATLANTICO_PHOTO,
  ATLANTICO_IMAGE_SHA256,ATLANTICO_SHA256,ATLANTICO_W,ATLANTICO_H,
  atlanticPhotoTiles,unpackAtlanticoSource,buildAtlanticoTrack
} from './install-circuito-atlantico-source.mjs';

const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const source=unpackAtlanticoSource();
const published=read(ATLANTICO_TARGET);
if(!source){
  assert.ok(!fs.existsSync(ATLANTICO_SOURCE),'Owner source status inconsistent');
  assert.notEqual(published.meta?.renderMode,'image-native',
    'Never activate the photographic Atlántico without its original .tdrtrack');
  assert.ok(!fs.existsSync('public/'+ATLANTICO_PHOTO),
    'Do not publish a substitute Atlántico photo ahead of owner source');
  console.log('Atlántico source pending: old playable circuit and preview preserved.');
}else{
  const {t,image}=source;
  assert.equal(hash(fs.readFileSync(ATLANTICO_SOURCE)),ATLANTICO_SHA256);
  assert.equal(hash(image),ATLANTICO_IMAGE_SHA256);
  const original=await sharp(image).metadata();
  assert.deepEqual([original.width,original.height],[ATLANTICO_W,ATLANTICO_H]);
  const built=buildAtlanticoTrack(t);
  assert.ok(built.diagnostics.authoredPreserved,
    'All owner checkpoints must be preserved; no automatic re-layout');
  assert.deepEqual(published,built.track,
    'Installed photo track must be deterministic from the source archive');
  assert.equal(published.meta.renderMode,'image-native');
  assert.equal(published.meta.imageNative.availability,'published');
  assert.equal(published.meta.id,'circuito-atlantico');
  assert.deepEqual([published.worldW,published.worldH],[4344,3258]);
  assert.equal(published.closed,true);
  assert.equal(published.raceType,'circuit');
  assert.equal(published.startLine,null,
    'A separate start line would make RaceScene classify a circuit as an A->B rally');
  assert.equal(published.carScale,1,'Keep all original car sizes');
  assert.equal(published.centerline.length,394);
  assert.deepEqual(published.centerline,t.centerline,
    'Preserve owner centerline 1:1 with the photo');
  assert.deepEqual(published.trackShape,t.trackShape,
    'Preserve 14+14 Bezier nodes/handles with no distortion');
  assert.deepEqual(published.finishLine.a,t.startLine.a);
  assert.deepEqual(published.finishLine.b,t.startLine.b);
  for(let i=0;i<2;i++){
    assert.deepEqual(published.checkpoints[i].a,t.checkpoints[i].a);
    assert.deepEqual(published.checkpoints[i].b,t.checkpoints[i].b);
  }
  assert.equal(published.checkpoints.length,2);
  assert.equal(hash(fs.readFileSync('public/'+ATLANTICO_PHOTO)),ATLANTICO_IMAGE_SHA256,
    'Master must be the exact original source photo');
  for(const tile of atlanticPhotoTiles){
    const f='public/'+tile.assetPath;
    assert.ok(fs.existsSync(f),'Missing GPU tile '+f);
    const info=await sharp(f).metadata();
    assert.deepEqual([info.width,info.height,info.format],
      [1448,1629,'webp']);
  }
  console.log('Atlántico 4344x3258 photo-native official, original pixels and 394 road points, 14+14 Bezier nodes, lap META + CP1/CP2, 6 image tiles confirmed.');
}
