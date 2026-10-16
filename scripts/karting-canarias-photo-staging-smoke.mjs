// Four immutable source WebP quadrants are displayed at 2.5x in the native photo-world.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const draft=read('public/assets/tracks/karting-canarias/photo-staging.json');
const live=read('src/game/tracks/library/karting-canarias/track.json');
assert.equal(draft.status,'published-native','Approved 2048x3072 photo is active only with the owner road geometry');
assert.equal(draft.trackId,'karting-canarias');
assert.deepEqual([draft.imageWidth,draft.imageHeight],[2048,3072]);
assert.equal(draft.tiles.length,4);
assert.equal(live.meta?.renderMode,'image-native','New Karting Canarias must use exactly the authored photo');
assert.deepEqual([live.worldW,live.worldH],[5120,7680]);
assert.equal(live.meta.imageNative.worldScale,2.5);
assert.deepEqual([live.meta.imageNative.width,live.meta.imageNative.height],[2048,3072]);
assert.equal(live.meta.imageNative.assetPath,draft.assetPath);
assert.equal(live.meta.imageNative.tiles.length,draft.tiles.length);
for(const [i,t] of draft.tiles.entries()) assert.deepEqual(live.meta.imageNative.tiles[i],
 {x:t.x,y:t.y,width:t.width,height:t.height,assetPath:t.assetPath});
const digest=p=>createHash('sha256').update(readFileSync('public/'+p)).digest('hex');
assert.equal(digest(draft.assetPath),draft.sourceSha256);
const master=await sharp('public/'+draft.assetPath).metadata();
assert.deepEqual([master.width,master.height,master.format],[2048,3072,'webp']);
for(const [i,t] of draft.tiles.entries()){
  assert.equal(t.x, (i%2)*1024);
  assert.equal(t.y, Math.floor(i/2)*1536);
  assert.equal(t.width,1024);assert.equal(t.height,1536);
  assert.equal(digest(t.assetPath),t.sha256);
  const meta=await sharp('public/'+t.assetPath).metadata();
  assert.deepEqual([meta.width,meta.height,meta.format],[1024,1536,'webp']);
  const a=await sharp('public/'+t.assetPath).raw().toBuffer();
  const b=await sharp('public/'+draft.assetPath).extract({left:t.x,top:t.y,width:t.width,height:t.height}).raw().toBuffer();
  assert.equal(a.length,b.length);
  let diff=0;for(let j=0;j<a.length;j++)diff+=Math.abs(a[j]-b[j]);
  assert.ok(diff/a.length<6,'Photo tile differs from master beyond WebP compression tolerance: '+t.assetPath);
}
console.log('Karting Canarias photo: original 2048x3072, 4 unchanged WebP quadrants; displayed world 5120x7680 via 2.5x scale, source SHA256 verified');
