import assert from 'node:assert/strict';
import { attachImageNativeTrackContract, isImageNativeTrackMeta } from '../src/game/tracks/imageNativeTrackContract.js';

const canvas={imageId:'img-karting',width:1672,height:941,type:'image/png',size:4200000};
const track={name:'Karting',worldW:1672,worldH:941,closed:true,raceType:'circuit',
  centerline:[{x:25,y:30,width:80},{x:40,y:55,width:80}],
  start:{x:25,y:30,r:0},finishLine:{a:{x:10,y:10},b:{x:20,y:10}},
  trackShape:{leftEdge:[],rightEdge:[]},meta:{author:'TrackStudio'}};
const before=JSON.stringify(track);
const native=attachImageNativeTrackContract(track,canvas);
assert.equal(JSON.stringify(track),before,'Author data is immutable');
assert.equal(native.worldW,1672);
assert.equal(native.worldH,941);
assert.deepEqual(native.centerline,track.centerline);
assert.deepEqual(native.trackShape,track.trackShape);
assert.deepEqual(native.finishLine,track.finishLine);
assert.equal(native.meta.author,'TrackStudio');
assert.equal(native.meta.imageNative.availability,'local','Do not claim local image is globally installed');
assert.equal(isImageNativeTrackMeta(native),true);
assert.equal(isImageNativeTrackMeta(track),false);
assert.equal(attachImageNativeTrackContract(track,null),track,'Legacy tracks are untouched');
assert.throws(()=>attachImageNativeTrackContract({...track,worldW:1673},canvas),/coordenadas/);
assert.throws(()=>attachImageNativeTrackContract(track,{...canvas,imageId:''}),/identificador/);
assert.throws(()=>attachImageNativeTrackContract(track,{...canvas,width:9000}),/límites/);
const stage={...track,closed:false,raceType:'stage',startLine:{a:{x:1,y:1},b:{x:1,y:2}}};
const nativeStage=attachImageNativeTrackContract(stage,canvas);
assert.equal(nativeStage.closed,false);
assert.equal(nativeStage.raceType,'stage');
assert.deepEqual(nativeStage.startLine,stage.startLine);
console.log('TrackStudio image-native contract: pixels 1:1, immutable geometry, stage intact, local asset clearly identified: OK');
