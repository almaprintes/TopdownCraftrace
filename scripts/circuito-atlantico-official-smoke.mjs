// New photo-native Atlántico is staged, not faked. Without owner's binary,
// classic Atlántico must remain untouched; after upload, exact authored photo,
// racing geometry and checkpoint positions must publish as a closed lap track.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import sharp from 'sharp';
import {ATLANTICO_WORLD_SCALE,scaleAtlanticoEnvironment} from '../src/game/tracks/atlanticoWorldScale.js';
import {describeImageNativeRace,validateImageNativeRaceDescriptor} from '../src/game/tracks/imageNativeRaceLoader.js';
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
  assert.deepEqual([published.worldW,published.worldH],
    [4344*ATLANTICO_WORLD_SCALE,3258*ATLANTICO_WORLD_SCALE]);
  assert.equal(published.meta.imageNative.worldScale,ATLANTICO_WORLD_SCALE);
  const desc=describeImageNativeRace('circuito-atlantico',()=>published);
  assert.equal(validateImageNativeRaceDescriptor(desc),desc);
  assert.throws(()=>validateImageNativeRaceDescriptor({...desc,worldScale:.95}),/escala/);
  assert.throws(()=>validateImageNativeRaceDescriptor({...desc,track:{...published,worldW:published.worldW+10}}),/escala/);
  assert.equal(published.closed,true);
  assert.equal(published.raceType,'circuit');
  assert.equal(published.startLine,null,
    'A separate start line would make RaceScene classify a circuit as an A->B rally');
  assert.equal(published.carScale,1,'Keep all original car sizes');
  assert.equal(published.centerline.length,394);
  for(let i=0;i<t.centerline.length;i++){
    assert.equal(published.centerline[i].x,t.centerline[i].x*ATLANTICO_WORLD_SCALE);
    assert.equal(published.centerline[i].y,t.centerline[i].y*ATLANTICO_WORLD_SCALE);
    if(Number.isFinite(t.centerline[i].width))
      assert.equal(published.centerline[i].width,t.centerline[i].width*ATLANTICO_WORLD_SCALE);
  }
  for(const side of ['leftEdge','rightEdge'])for(let i=0;i<t.trackShape[side].length;i++){
    for(const k of ['x','y'])assert.equal(published.trackShape[side][i][k],
      t.trackShape[side][i][k]*ATLANTICO_WORLD_SCALE);
    for(const handle of ['handleIn','handleOut'])for(const k of ['x','y'])
      assert.equal(published.trackShape[side][i][handle][k],
        t.trackShape[side][i][handle][k]*ATLANTICO_WORLD_SCALE);
  }
  for(const end of ['a','b'])for(const k of ['x','y']){
    assert.equal(published.finishLine[end][k],t.startLine[end][k]*ATLANTICO_WORLD_SCALE);
    for(let i=0;i<2;i++)assert.equal(published.checkpoints[i][end][k],
      t.checkpoints[i][end][k]*ATLANTICO_WORLD_SCALE);
  }
  assert.equal(published.checkpoints.length,2);
  const mockEnv={trackId:'circuito-atlantico',collisionLines:[{halfThickness:9,
    nodes:[{x:100,y:300,in:{x:90,y:300},out:{x:110,y:300}}]}],
    collisionZones:[{points:[{x:500,y:400},{x:600,y:400},{x:600,y:600}]}]};
  const scaleEnv=scaleAtlanticoEnvironment(mockEnv);
  assert.equal(scaleEnv.collisionLines[0].halfThickness,9*ATLANTICO_WORLD_SCALE);
  assert.equal(scaleEnv.collisionLines[0].nodes[0].x,100*ATLANTICO_WORLD_SCALE);
  assert.equal(scaleEnv.collisionLines[0].nodes[0].in.x,90*ATLANTICO_WORLD_SCALE);
  assert.equal(scaleEnv.collisionZones[0].points[0].y,400*ATLANTICO_WORLD_SCALE);
  assert.equal(mockEnv.collisionLines[0].nodes[0].x,100,'Never change owner original');
  const retired=read('src/game/tracks/library/track01/track01.environment.json');
  assert.equal(retired.trackId,'circuito-atlantico');
  for(const key of ['environment','surfaces','linearBarriers','collisionLines','collisionZones'])
    assert.deepEqual(retired[key],[],key+' must have no old assets/colliders');
  assert.deepEqual(retired.materials,{},'No obsolete terrain material may load');
  assert.equal(hash(fs.readFileSync('public/'+ATLANTICO_PHOTO)),ATLANTICO_IMAGE_SHA256,
    'Master must be the exact original source photo');
  for(const tile of atlanticPhotoTiles){
    const f='public/'+tile.assetPath;
    assert.ok(fs.existsSync(f),'Missing GPU tile '+f);
    const info=await sharp(f).metadata();
    assert.deepEqual([info.width,info.height,info.format],
      [1448,1629,'webp']);
  }
  console.log('Atlántico photo-original 4344x3258, published world 94%, 394 geometry points, 14+14 Bezier nodes, META + CP1/CP2, 6 unchanged photo tiles, no legacy environment.');
}
