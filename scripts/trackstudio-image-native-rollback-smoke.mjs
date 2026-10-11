import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {makeKartingPreviewRecord,getLocalKartingPreview,LOCAL_KARTING_PREVIEW_KEY}
  from '../src/game/tracks/localKartingPreview.js';

const ring=(x1,y1,x2,y2)=>[[x1,y1],[x2,y1],[x2,y2],[x1,y2]].map(([x,y])=>({
 x,y,handleIn:{x:x-6,y:y+3},handleOut:{x:x+6,y:y-3}
}));
const shape={version:1,closed:true,leftEdge:ring(200,200,800,700),
  rightEdge:ring(100,100,900,800),sourceNodeCount:4};
const centerline=Array.from({length:32},(_,i)=>({
 x:150+i*12,y:300+(i%8)*10,width:70
}));
const imageCanvas={width:1000,height:900,imageId:'karting-image',size:1012345,type:'image/png'};
const editor={imageCanvas,trackShape:shape,isClosed:true};
const gameTrack={
 worldW:1000,worldH:900,trackWidth:70,grassMargin:120,sampleStepPx:12,cellSize:400,shoulderPx:10,
 centerline,trackShape:shape,closed:true,raceType:'circuit',
 finishLine:{a:{x:246,y:270},b:{x:315,y:280},normal:{x:0,y:1}},
 checkpoints:[{a:{x:390,y:375},b:{x:390,y:400},normal:{x:1,y:0}}],
 start:{x:150,y:300,r:0},grid:null
};
const editorBefore=JSON.stringify(editor),gameBefore=JSON.stringify(gameTrack);
const record=makeKartingPreviewRecord(editor,gameTrack);
assert.equal(record.version,1);
assert.equal(record.track.worldW,1000);
assert.equal(record.track.worldH,900);
assert.equal(record.track.trackWidth,70);
assert.equal(record.imageMeta.width,1000);
assert.equal(record.imageMeta.height,900);
assert.equal(record.track.carScale,.65,'Return to original pre-x3 visual car size');
assert.equal(JSON.stringify(editor),editorBefore,'Never edit source project');
assert.equal(JSON.stringify(gameTrack),gameBefore,'Never mutate track centerline');

const oldRecord=JSON.parse(JSON.stringify(record));
oldRecord.version=2;oldRecord.worldScale=3;
const t=oldRecord.track,three=n=>Number.isFinite(n)?n*3:n;
const scaledPoint=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)
 ?{...p,x:three(p.x),y:three(p.y)}:p;
const scaledGate=g=>g?{...g,a:scaledPoint(g.a),b:scaledPoint(g.b)}:g;
t.worldW*=3;t.worldH*=3;
for(const key of ['trackWidth','grassMargin','sampleStepPx','cellSize','shoulderPx'])
 if(Number.isFinite(t[key]))t[key]*=3;
t.centerline=t.centerline.map(p=>({...scaledPoint(p),width:p.width*3}));
for(const side of ['leftEdge','rightEdge'])
 t.trackShape[side]=t.trackShape[side].map(p=>({
   ...scaledPoint(p),handleIn:scaledPoint(p.handleIn),handleOut:scaledPoint(p.handleOut)
 }));
t.start=scaledPoint(t.start);
if(t.finishLine)t.finishLine=scaledGate(t.finishLine);
t.checkpoints=t.checkpoints.map(scaledGate);
t.imageWorldScale=3;t.meta.imageWorldScale=3;
const store=new Map();
globalThis.localStorage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)};
store.set('tdr:trackstudio:karting-tenerife-preview-v1',JSON.stringify(oldRecord));
const recovered=getLocalKartingPreview(LOCAL_KARTING_PREVIEW_KEY);
assert.ok(Math.abs(recovered.track.start.x-record.track.start.x)<1e-7 &&
  Math.abs(recovered.track.start.y-record.track.start.y)<1e-7,
  'Reconstructed floating point spawn must be equivalent to native coordinates');
const normalized={...recovered,track:{...recovered.track,start:record.track.start}};
assert.deepEqual(normalized,record,
  'Recover all source project coordinates and properties from old x3 cache');
assert.equal(JSON.parse(store.get('tdr:trackstudio:karting-tenerife-preview-v1')).version,2,
  'Read-only migration never overwrites the user browser storage');
assert.equal(getLocalKartingPreview('karting-tenerife'),null,'Published circuit never overridden');
store.set('tdr:trackstudio:karting-tenerife-preview-v1',JSON.stringify(record));
assert.deepEqual(getLocalKartingPreview(LOCAL_KARTING_PREVIEW_KEY),record);

const race=readFileSync('src/game/scenes/RaceScene.js','utf8');
const image=readFileSync('src/game/tracks/localKartingPreview.js','utf8');
const bike=readFileSync('src/game/scenes/RaceBicycleHandlingScene.js','utf8');
assert.ok(race.includes('this.carParams = resolveCarParams(this.baseSpec, this.tuning);'),
  'Physics, braking, steering and speed must use original car spec');
assert.ok(!race.includes('imageNativeDrivingProfile'),'No rejected car dynamics patch');
assert.ok(!race.includes('imageNativeCarVisualScale'),'No x3 tiny-car correction patch');
assert.ok(race.includes('const TARGET_W = 96 * vScale * VISUAL_SCALE_MULT * trackCarScale;'));
assert.ok(race.includes('const TARGET_H = 48 * vScale * VISUAL_SCALE_MULT * trackCarScale;'));
assert.ok(race.includes('body.setCircle(Math.round(baseRadius * vScale * trackCarScale));'),
 'Return original car hitbox and geometry');
assert.ok(!bike.includes('unscaledCarVisualLength'),'Kinematic physics restored');
assert.ok(bike.includes('const w=Number(sprite?.displayWidth || sprite?.width || 0);'));
assert.ok(image.includes('return {version:1,imageId,imageMeta:jsonCopy(editor.imageCanvas),track};'),
 'New preview stays at authored image coordinates');
const loader=readFileSync('src/game/tracks/imageNativeRaceLoader.js','utf8');
assert.ok(loader.includes('.setOrigin(0,0).setDepth(9).setScrollFactor(1)'),
 'The photo remains native 1:1 without any runtime world scale');
assert.ok(loader.includes('img.naturalWidth!==desc.width||img.naturalHeight!==desc.height'),
 'Decoded photo must match the track dimensions');
assert.ok(!image.includes('scaleImageNativeTrackForRace'));
console.log('DEV pre-x3 rollback: image/world 1:1, car sprite stock, physics stock, old browser preview safely restored: OK');
