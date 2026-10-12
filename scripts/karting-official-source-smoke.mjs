import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {installKartingTenerife} from './install-karting-tenerife-source.mjs';
// Puede ejecutarse ANTES de npm ci: solo usa API nativa de Node.
const result=await installKartingTenerife({withAssets:false});
assert.deepEqual([result.worldW,result.worldH,result.points,result.nodes],[3344,1882,1038,37]);
const track=JSON.parse(readFileSync('src/game/tracks/library/karting-tenerife/track.json','utf8'));
assert.equal(track.trackWidth,140);
assert.equal(track.carScale,1);
assert.equal(track.checkpointMode,'authored');
assert.equal(track.checkpoints.length,2);
assert.equal(track.meta?.renderMode,'image-native');
assert.equal(track.meta?.imageNative?.availability,'published');
assert.deepEqual([track.start.x,track.start.y],[2685,1211]);
const a0=track.centerline[0],a5=track.centerline[5];
const expectedR=Math.atan2(a5.y-a0.y,a5.x-a0.x);
assert.ok(Math.abs(track.start.r-expectedR)<1e-10,'Karting race start must follow the authored centerline tangent');
assert.ok(track.start.r<-1.1&&track.start.r>-1.8,'Karting race start must head toward the TOP of the photo, not right');

assert.ok(track.trackShape?.leftEdge?.length>10);
assert.ok(track.trackShape?.rightEdge?.length>10);
const beauty=readFileSync('src/game/tracks/trackBeautyLayers.generated.js','utf8');
assert.ok(beauty.includes('karting-tenerife-trackstudio-0.webp'));
assert.ok(beauty.includes('worldW: 3344, worldH: 1882'));
const env=JSON.parse(readFileSync('src/game/tracks/library/karting-tenerife/karting-tenerife.environment.json','utf8'));
assert.deepEqual(env.environment,[]);
assert.deepEqual(env.surfaces,[]);
assert.deepEqual(env.linearBarriers,[]);
console.log('Karting Tenerife oficial: trazado, límites Bézier, meta, 2 sectores y foto 1:1 OK');
