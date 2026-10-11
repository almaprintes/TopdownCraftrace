import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {makeKartingPreviewRecord,getLocalKartingPreview,LOCAL_KARTING_PREVIEW_KEY} from '../src/game/tracks/localKartingPreview.js';
import {CAR_SPECS} from '../src/game/cars/carSpecs.js';

const ring=(x1,y1,x2,y2)=>{
  const q=[[x1,y1],[x2,y1],[x2,y2],[x1,y2]];
  return q.map(([x,y],i)=>({
    x,y,handleIn:{x:x+(q[(i+3)%4][0]-x)/3,y:y+(q[(i+3)%4][1]-y)/3},
    handleOut:{x:x+(q[(i+1)%4][0]-x)/3,y:y+(q[(i+1)%4][1]-y)/3}
  }));
};
const shape={version:1,closed:true,leftEdge:ring(200,200,800,700),rightEdge:ring(100,100,900,800)};
const nodes=Array.from({length:30},(_,i)=>({
  x:500+300*Math.cos(2*Math.PI*i/30),y:450+250*Math.sin(2*Math.PI*i/30),width:200
}));
const editor={imageCanvas:{imageId:'foto-original',width:1000,height:900,size:2400000,type:'image/webp'},trackShape:shape,isClosed:true};
const authored={id:'new-karting',worldW:1000,worldH:900,trackWidth:200,
  carScale:.65,meta:{carScale:.65,author:'TrackStudio'},
  trackShape:shape,centerline:nodes,closed:true,raceType:'circuit',
  start:{x:nodes[0].x,y:nodes[0].y,r:0},
  finishLine:{a:{x:500,y:100},b:{x:600,y:100}},checkpoints:[],grid:null};
const sourceBefore=JSON.stringify(authored),editorBefore=JSON.stringify(editor);
const record=makeKartingPreviewRecord(editor,authored);
assert.equal(record.track.carScale,1);
assert.equal(record.track.meta.carScale,1);
assert.equal(record.track.meta.author,'TrackStudio');
assert.equal(JSON.stringify(authored),sourceBefore,'Authored track remains untouched');
assert.equal(JSON.stringify(editor),editorBefore,'Original project remains untouched');
assert.deepEqual(record.track.centerline,authored.centerline);
assert.deepEqual(record.track.trackShape,authored.trackShape);
assert.equal(record.track.worldW,1000);
assert.equal(record.track.worldH,900);
assert.equal(record.imageId,'foto-original');
assert.equal(record.track.key,LOCAL_KARTING_PREVIEW_KEY);

const k='tdr:trackstudio:karting-tenerife-preview-v1',store=new Map();
globalThis.localStorage={getItem:key=>store.get(key)||null,setItem:(key,val)=>store.set(key,val)};
const legacy=structuredClone(record);
legacy.track.carScale=.65;legacy.track.meta.carScale=.65;
store.set(k,JSON.stringify(legacy));
const before=store.get(k);
const recovered=getLocalKartingPreview();
assert.deepEqual(recovered.track,record.track,'Legacy preview uses factory scale without retracing');
assert.equal(store.get(k),before,'Old browser preview remains available for recovery');
assert.equal(getLocalKartingPreview('karting-tenerife'),null,'Official track has separate identity');
store.set(k,JSON.stringify(record));
assert.deepEqual(getLocalKartingPreview(),record,'New preview is unchanged on read');

const helix=CAR_SPECS.helix_spark;
assert.equal(helix.visualScale,1,'Helix Spark factory visual spec is unchanged');
const baseRadius=14,visualMultiplier=1.35,v=helix.visualScale;
assert.equal(Math.round(baseRadius*v*record.track.carScale),14,'Factory hitbox is restored');
assert.ok(Math.abs(96*v*visualMultiplier*record.track.carScale-129.6)<1e-9,'Factory sprite width target is restored');
const race=readFileSync('src/game/scenes/RaceScene.js','utf8');
assert.ok(race.includes('body.setCircle(Math.round(baseRadius * vScale * trackCarScale));'));
assert.ok(race.includes('const TARGET_W = 96 * vScale * VISUAL_SCALE_MULT * trackCarScale;'));
assert.ok(race.includes('this.carParams = resolveCarParams(this.baseSpec, this.tuning);'));
assert.ok(!race.includes('imageNativeDrivingProfile'),'No tuning overrides allowed');
console.log('Karting photo preview: stock Spark sprite + radius, legacy cache repaired without modifying image, physics or .tdrtrack: OK');
