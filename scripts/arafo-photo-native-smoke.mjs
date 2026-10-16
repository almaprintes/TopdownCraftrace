// Arafo → Los Loros: exact owner geometry, photo tiles, and *open* surface.
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import sharp from 'sharp';
import {makeOpenStagePhotoMask} from '../src/game/tracks/openStagePhotoMask.js';
import {describeImageNativeRace,validateImageNativeRaceDescriptor,applyImageNativeTrackPhysics} from '../src/game/tracks/imageNativeRaceLoader.js';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const id='rally-arafo-los-loros';
const exact=read('src/game/tracks/library/'+id+'/trackstudio-gameTrack-exact.json');
const installed=read('src/game/tracks/library/'+id+'/track.json');
assert.deepEqual(installed.centerline,exact.centerline,'The original 2241 TrackStudio points must be lossless');
assert.deepEqual(installed.trackShape,exact.trackShape,'The original Bézier handles must be lossless');
for(const k of ['start','startLine','finishLine','checkpoints'])assert.deepEqual(installed[k],exact[k],k+' is owner-authored');
assert.equal(installed.centerline.length,2241);
assert.equal(installed.trackShape.closed,false);
assert.equal(installed.closed,false);
assert.equal(installed.raceType,'stage');
assert.equal(installed.meta.imageNative.availability,'published');
const tiles=installed.meta.imageNative.tiles;
assert.equal(tiles.length,4);
const keys=new Set();
for(const t of tiles){
 const asset=t.assetPath;
 assert.match(asset,/^assets\/tracks\/rally-arafo-los-loros\/photo-[01]-[01]\.webp$/);
 assert.ok(!keys.has(asset),'Repeated photo tile: '+asset);keys.add(asset);
 assert.equal(t.width,941);assert.equal(t.height,1672);
 assert.equal(t.x%941,0);assert.equal(t.y%1672,0);
 const bytes=readFileSync('public/'+asset);
 assert.equal(bytes.subarray(0,4).toString(),'RIFF','Genuine WebP tile: '+asset);
 assert.ok(bytes.length>300000,'Truncated image: '+asset);
}
assert.equal(tiles.reduce((total,t)=>total+t.width*t.height,0),1882*3344);

// The source ZIP names photo-ROW-COLUMN, NOT photo-X-Y. A wrong interchange
// of photo-0-1 and photo-1-0 creates the visible discontinuity in Arafo.
const expectedTiles = [
  ['photo-0-0.webp', 0, 0],
  ['photo-0-1.webp', 941, 0],
  ['photo-1-0.webp', 0, 1672],
  ['photo-1-1.webp', 941, 1672]
];
for (const [name, x, y] of expectedTiles) {
  const tile = tiles.find(t => t.assetPath.endsWith('/' + name));
  assert.ok(tile, 'Missing Arafo image tile ' + name);
  assert.deepEqual([tile.x, tile.y], [x, y],
    name + ' must use row/column order; never interchange tile 0-1 with 1-0');
}
assert.equal(new Set(tiles.map(t => t.x + ':' + t.y)).size, 4,
  'Every Arafo tile must occupy a distinct quadrant');

// Pixel-level photo seam check: the original four WebP crops must be
// significantly more continuous in authored positions than any permutation.
// Tests alone that check names/sizes would miss swapped content.
const photoPixels = await Promise.all(expectedTiles.map(async ([name]) => {
  const {data, info} = await sharp('public/assets/tracks/rally-arafo-los-loros/' + name)
    .removeAlpha().raw().toBuffer({resolveWithObject:true});
  assert.deepEqual([info.width, info.height, info.channels], [941, 1672, 3]);
  return {data, w:info.width, h:info.height};
}));
function seamDifference(first, second, direction) {
  let differences = 0;
  let samples = 0;
  const count = direction === 'horizontal' ? first.h : first.w;
  const pixel = (tile, x, y) => (y * tile.w + x) * 3;
  for (let i = 0; i < count; i += 5) {
    const a = direction === 'horizontal'
      ? pixel(first, first.w - 1, i) : pixel(first, i, first.h - 1);
    const b = direction === 'horizontal'
      ? pixel(second, 0, i) : pixel(second, i, 0);
    for (let c = 0; c < 3; c++) differences += Math.abs(first.data[a+c] - second.data[b+c]);
    samples += 3;
  }
  return differences / samples;
}
const layoutCost = q =>
  seamDifference(q[0], q[1], 'horizontal') +
  seamDifference(q[2], q[3], 'horizontal') +
  seamDifference(q[0], q[2], 'vertical') +
  seamDifference(q[1], q[3], 'vertical');
const authoredCost = layoutCost(photoPixels);
let bestCost = Infinity;
for (let a = 0; a < 4; a++)
  for (let b = 0; b < 4; b++)
    for (let c = 0; c < 4; c++)
      for (let d = 0; d < 4; d++) {
        if (new Set([a, b, c, d]).size !== 4) continue;
        bestCost = Math.min(bestCost,
          layoutCost([photoPixels[a], photoPixels[b], photoPixels[c], photoPixels[d]]));
      }
assert.ok(authoredCost <= bestCost * 1.05 + 1,
  'Authored photo tile layout must be the most continuous 2x2 arrangement. Actual ' +
  authoredCost.toFixed(2) + '; best ' + bestCost.toFixed(2));
console.log('Arafo photo quadrant order/pixel seams OK: ' + authoredCost.toFixed(2) +
  ' (best possible ' + bestCost.toFixed(2) + ')');

assert.equal(statSync('public/'+installed.meta.imageNative.assetPath).size,1890642);
// Registry consumes this exact JSON with import.meta.glob under Vite;
// plain Node regression uses its authored metadata directly.
const registered=installed;
assert.equal(registered.closed,false);
assert.equal(registered.startLine?.a?.x,exact.startLine.a.x);
assert.equal(registered.trackShape?.closed,false);
const descriptor=describeImageNativeRace(id,key=>key===id?registered:null);
assert.equal(descriptor.type,'published');
assert.equal(descriptor.tiles.length,4);
assert.equal(validateImageNativeRaceDescriptor(descriptor),descriptor);
const mask=makeOpenStagePhotoMask(installed.trackShape,1882,3344);
assert.equal(mask.quadCount,(82-1)*12);
assert.ok(mask.cellCount>50);
const mid=(a,b)=>({x:(a.x+b.x)/2,y:(a.y+b.y)/2});
for(let i of [0,10,25,42,61,81]){
 const p=mid(installed.trackShape.leftEdge[i],installed.trackShape.rightEdge[i]);
 assert.ok(mask.isOnTrack(p.x,p.y),'Open-road centre must be drivable at node '+i);
 assert.equal(mask.isGrass(p.x,p.y),false);
}
for(const p of [[0,0],[1881,0],[0,3343]]){
 assert.equal(mask.isOnTrack(...p),false,'Outside photo road '+p);
}
assert.throws(()=>validateImageNativeRaceDescriptor({...descriptor,track:{...descriptor.track,trackShape:{...descriptor.track.trackShape,closed:true}}}),/topolog/i);
assert.throws(()=>makeOpenStagePhotoMask({...installed.trackShape,closed:true},1882,3344),/ABIERTOS/);
const scene={track:{geom:{grass:{}}},_isInBand(){return false}};
applyImageNativeTrackPhysics(scene,descriptor);
assert.equal(scene._tdrStudioMask.quadCount,mask.quadCount);
console.log('ARAFO native photo OK: original 2241 nodes + both 82-control open splines, 4 WebP tiles, distinct stage endpoints, no closed collision shortcut.');
