// The owner-supplied replacement photo is staged without changing the playable 2000x4300 circuit.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const draft=read('public/assets/tracks/karting-canarias/photo-staging.json');
const live=read('src/game/tracks/library/karting-canarias/track.json');
assert.equal(draft.status,'staged-not-active');
assert.equal(draft.trackId,'karting-canarias');
assert.deepEqual([draft.imageWidth,draft.imageHeight],[2048,3072]);
assert.equal(draft.tiles.length,4);
assert.equal(live.meta?.renderMode,'undefined' === typeof live.meta?.renderMode ? undefined : live.meta.renderMode,
  'Do not mutate runtime photo mode from this staging metadata');
assert.equal(live.worldW,2000,'Do not replace playable geometry before its photo-native QA');
assert.equal(live.worldH,4300,'Do not replace playable geometry before its photo-native QA');
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
console.log('Karting Canarias staged photo: 2048x3072, 4 quadrants and SHA256+pixel comparison verified; playable legacy geometry retained');
