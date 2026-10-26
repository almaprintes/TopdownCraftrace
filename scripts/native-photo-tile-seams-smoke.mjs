import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {photoTileSeamlessBounds,PHOTO_TILE_JOIN_OVERDRAW} from '../src/game/tracks/nativePhotoTileSeams.js';

assert.equal(PHOTO_TILE_JOIN_OVERDRAW,2);
const b=(x,y,w,h,totalW=3344,totalH=1882,scale=1,decodedW=w,decodedH=h)=>
  photoTileSeamlessBounds({
    x,y,decodedWidth:decodedW,decodedHeight:decodedH,
    tileScaleX:w/decodedW,tileScaleY:h/decodedH,
    photoWidth:totalW,photoHeight:totalH,worldScale:scale
  });
const tl=b(0,0,1672,941);
const tr=b(1672,0,1672,941);
const bl=b(0,941,1672,941);
const br=b(1672,941,1672,941);
assert.equal(tl.x,0);assert.equal(tl.y,0);
assert.equal(tr.x+tr.width,3344);
assert.equal(br.y+br.height,1882);
assert.ok(tl.x+tl.width-tr.x>=4,'Horizontal joint must overdraw from both tiles');
assert.ok(tl.y+tl.height-bl.y>=4,'Vertical joint must overdraw from both tiles');
assert.ok(tr.y+tr.height-br.y>=4,'Right vertical joint must overdraw');
assert.ok(bl.x+bl.width-br.x>=4,'Bottom horizontal joint must overdraw');
assert.deepEqual(b(0,0,1200,800,1200,800),{x:0,y:0,width:1200,height:800},
  'Non-tiled photos must not be altered');
const compact=b(1672,941,1672,941,3344,1882,1,1087,612);
assert.ok(Math.abs(compact.x-br.x)<1e-9&&Math.abs(compact.y-br.y)<1e-9);
assert.ok(Math.abs(compact.width-br.width)<1e-9&&Math.abs(compact.height-br.height)<1e-9,
  'Compact iOS textures must use exactly the same screen geometry');
const scaled=b(1672,0,1672,941,3344,1882,2.5);
assert.ok(Math.abs(scaled.x-tr.x*2.5)<1e-9);
assert.ok(Math.abs(scaled.width-tr.width*2.5)<1e-9,
  'Enlarged world scale must preserve overlapping joins');
assert.throws(()=>b(3300,0,1672,941),/Invalid native photo tile bounds/);
const loader=readFileSync('src/game/tracks/imageNativeRaceLoader.js','utf8');
assert.match(loader,/const bounds=photoTileSeamlessBounds\(/);
assert.match(loader,/sprite\.setDisplaySize\(bounds\.width,bounds\.height\)/);
assert.match(loader,/scene\._trackBeautyTiles=sprites/);
assert.match(readFileSync('src/game/tracks/photoCanopyOcclusion.js','utf8'),/setScale\(photo\.scaleX,photo\.scaleY\)/,
  'Canopy needs the same corrected texture transform');
console.log('Native photo tile seams OK: 2px internal overdraw, no exterior crop, exact compact and scaled-world geometry.');
