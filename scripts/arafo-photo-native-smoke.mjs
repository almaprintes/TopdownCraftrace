// Arafo → Los Loros: exact owner geometry, photo tiles, and *open* surface.
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import {makeOpenStagePhotoMask} from '../src/game/tracks/openStagePhotoMask.js';
import {describeImageNativeRace,validateImageNativeRaceDescriptor,applyImageNativeTrackPhysics} from '../src/game/tracks/imageNativeRaceLoader.js';
import {TRACK_REGISTRY} from '../src/game/tracks/trackRegistry.js';
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
assert.equal(statSync('public/'+installed.meta.imageNative.assetPath).size,1890642);
const registered=TRACK_REGISTRY[id];
assert.equal(registered.closed,false);
assert.equal(registered.startLine?.a?.x,exact.startLine.a.x);
assert.equal(registered.trackShape?.closed,false);
const descriptor=describeImageNativeRace(id,key=>TRACK_REGISTRY[key]);
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
