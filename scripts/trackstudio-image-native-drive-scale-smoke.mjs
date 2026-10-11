import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnUpstreamOfFinish} from '../src/game/tracks/imageNativeDriving.js';
import {scaleImageNativeTrackForRace,IMAGE_NATIVE_WORLD_SCALE} from '../src/game/tracks/imageNativeWorldScale.js';
import {makeKartingPreviewRecord,getLocalKartingPreview,makeKartingShapeMask,LOCAL_KARTING_PREVIEW_KEY} from '../src/game/tracks/localKartingPreview.js';

assert.equal(IMAGE_NATIVE_WORLD_SCALE,3,'First image preview must test 3x world');
const nodes=Array.from({length:30},(_,i)=>{
 const t=i*Math.PI*2/30, cx=836+410*Math.cos(t),cy=470+300*Math.sin(t);
 return {x:cx,y:cy,
  handleIn:{x:cx-14*Math.sin(t),y:cy+12*Math.cos(t)},
  handleOut:{x:cx+14*Math.sin(t),y:cy-12*Math.cos(t)}};
});
const makeEdge=(shift,count)=>Array.from({length:count},(_,i)=>{
 const t=i*Math.PI*2/count,x=836+(410+shift)*Math.cos(t),y=470+(300+shift)*Math.sin(t);
 return {x,y,handleIn:{x:x+22*Math.sin(t),y:y-16*Math.cos(t)},
  handleOut:{x:x-22*Math.sin(t),y:y+16*Math.cos(t)}};
});
const shape={version:1,closed:true,sourceNodeCount:30,leftEdge:makeEdge(-30,30),rightEdge:makeEdge(30,31)};
const authored=[
  [1335,664],[1336,656],[1337,646],[1339,634],[1341,620],
  [1343,604],[1345,586],[1347,567],[1350,547],[1353,525],
  [1356,503],[1358,480],[1361,456],[1364,433],[1367,409],
  [1370,385],[1373,361],[1376,338],[1379,316],[1382,294]
].map(([x,y])=>({x,y,width:70}));
const route=[...authored,{x:1400,y:170},{x:1100,y:150},{x:500,y:300},
  {x:350,y:700},{x:1000,y:800},{x:1335,y:664}];
const gate={a:{x:1327,y:452},b:{x:1396,y:461},
  normal:{x:.12518097485904683,y:-.9921339241923636}};
const project={
 name:'Karting Test',worldW:1672,worldH:941,trackWidth:70,
 grassMargin:120,sampleStepPx:12,cellSize:400,shoulderPx:10,
 centerline:route,closed:true,raceType:'circuit',
 start:{x:1335,y:664,r:-1.5},finishLine:gate,finish:gate,
 checkpoints:[{a:{x:880,y:300},b:{x:930,y:310},normal:{x:.2,y:.98}},
              {a:{x:255,y:430},b:{x:255,y:490},normal:{x:1,y:0}}],
 startLine:null,trackShape:shape,grid:null
};
const before=JSON.stringify(project);
const upstream=spawnUpstreamOfFinish(route,gate,65);
assert.ok(upstream&&upstream.y>=515&&upstream.y<=527,'Keep near-finish spawn in source pixels');
assert.ok(upstream.r<-.9&&upstream.r>-1.8);
const scaled=scaleImageNativeTrackForRace(project,3);
assert.equal(JSON.stringify(project),before,'NEVER overwrite TrackStudio geometry');
assert.equal(scaled.worldW,5016);
assert.equal(scaled.worldH,2823);
assert.equal(scaled.trackWidth,210);
assert.equal(scaled.sampleStepPx,36,'World-time sampling density must stay constant');
assert.equal(scaled.cellSize,1200,'Do not multiply culling cells 9x');
assert.equal(scaled.grassMargin,360);
assert.equal(scaled.shoulderPx,30);
assert.equal(scaled.centerline.length,route.length);
assert.equal(scaled.centerline[4].x,route[4].x*3);
assert.equal(scaled.centerline[4].y,route[4].y*3);
assert.equal(scaled.centerline[4].width,210);
assert.equal(scaled.trackShape.leftEdge.length,30);
assert.equal(scaled.trackShape.rightEdge.length,31);
assert.equal(scaled.trackShape.rightEdge[10].handleIn.x,shape.rightEdge[10].handleIn.x*3);
assert.equal(scaled.trackShape.leftEdge[10].handleOut.y,shape.leftEdge[10].handleOut.y*3);
assert.equal(scaled.finishLine.a.x,gate.a.x*3);
assert.equal(scaled.finishLine.a.y,gate.a.y*3);
assert.deepEqual(scaled.finishLine.normal,gate.normal,'Unit gate normal is not position');
assert.equal(scaled.checkpoints[1].a.x,project.checkpoints[1].a.x*3);
assert.equal(scaled.checkpoints[1].b.y,project.checkpoints[1].b.y*3);
assert.deepEqual(scaled.checkpoints[0].normal,project.checkpoints[0].normal);
assert.equal(scaled.start.x,project.start.x*3);
assert.equal(scaled.start.r,project.start.r);
assert.equal(scaled.imageWorldScale,3);
assert.equal(scaled.meta.imageWorldScale,3);
assert.throws(()=>scaleImageNativeTrackForRace(scaled,10),/Escala/);

// Road/grass physics must map exactly at equivalent pixel coordinates.
const maskSource=makeKartingShapeMask(shape,1672,941),
      maskScaled=makeKartingShapeMask(scaled.trackShape,scaled.worldW,scaled.worldH);
for(const [x,y] of [[100,100],[836,470],[836,150],[250,600],[1200,720],[1600,900]]){
  assert.equal(maskScaled.isOnTrack(x*3,y*3),maskSource.isOnTrack(x,y),
    'Scaled track mismatch at '+x+','+y);
  assert.equal(maskScaled.isGrass(x*3,y*3),maskSource.isGrass(x,y),
    'Scaled grass mismatch at '+x+','+y);
}
const editor={imageCanvas:{width:1672,height:941,imageId:'karting-image',type:'image/png',size:4250000},trackShape:shape,isClosed:true};
const record=makeKartingPreviewRecord(editor,project);
assert.equal(record.version,2);
assert.equal(record.worldScale,3);
assert.equal(record.track.worldW,5016);
assert.equal(record.track.worldH,2823);
assert.equal(record.imageMeta.width,1672);
assert.equal(record.imageMeta.height,941);
assert.equal(record.imageMeta.size,4250000,'Texture bytes unchanged');
assert.equal(record.track.start.x,upstream.x*3);
assert.equal(record.track.start.y,upstream.y*3);
assert.equal(record.track.start.r,upstream.r);
assert.deepEqual(JSON.stringify(project),before);
const store=new Map();
globalThis.localStorage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)};
store.set('tdr:trackstudio:karting-tenerife-preview-v1',JSON.stringify(record));
assert.deepEqual(getLocalKartingPreview(LOCAL_KARTING_PREVIEW_KEY),record);
assert.equal(getLocalKartingPreview('karting-tenerife'),null);
const legacy={version:1,imageId:record.imageId,imageMeta:record.imageMeta,
  track:{...project,meta:{localPreview:true,source:'trackstudio-image-native'}}};
store.set('tdr:trackstudio:karting-tenerife-preview-v1',JSON.stringify(legacy));
const recovered=getLocalKartingPreview(LOCAL_KARTING_PREVIEW_KEY);
assert.equal(recovered.version,2,'Old browser-cached previews must migrate only in memory');
assert.equal(recovered.track.worldW,5016);
assert.equal(recovered.track.finishLine.b.y,gate.b.y*3);
assert.equal(JSON.parse(store.get('tdr:trackstudio:karting-tenerife-preview-v1')).version,1,
  'Do not modify user storage while reading');

const race=readFileSync('src/game/scenes/RaceScene.js','utf8');
assert.ok(race.includes('this.carParams = resolveCarParams(this.baseSpec, this.tuning);'));
assert.ok(!race.includes('imageNativeDrivingProfile'),'Remove previous track-specific physics override');
const driving=readFileSync('src/game/tracks/imageNativeDriving.js','utf8');
assert.ok(!driving.includes('imageNativeDrivingProfile'),'Remove unused tuning workaround too');
const local=readFileSync('src/game/tracks/localKartingPreview.js','utf8');
assert.ok(local.includes('scaleImageNativeTrackForRace(track,IMAGE_NATIVE_WORLD_SCALE)'));
assert.ok(local.includes("spawnUpstreamOfFinish(gameTrack.centerline,gameTrack.finishLine,65)"));
assert.ok(local.includes('.setScale(scale).setDepth(9)'),'Scale sprite, never rasterize a 5016x2823 PNG');
assert.ok(local.includes('img.naturalWidth!==saved.imageMeta.width'));
assert.ok(local.includes('img.naturalWidth*scale!==saved.track.worldW'));
console.log('TrackStudio x3 world: ORIGINAL CAR PHYSICS, screenshot-sized GPU image, all gates/edges/roads and legacy compatibility: OK');
