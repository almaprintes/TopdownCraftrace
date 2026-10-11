import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {makeKartingPreviewRecord,getLocalKartingPreview,makeKartingShapeMask,LOCAL_KARTING_PREVIEW_KEY} from '../src/game/tracks/localKartingPreview.js';
const points=[[100,100],[900,100],[900,800],[100,800]];
function ring(x1,y1,x2,y2){
 const q=[[x1,y1],[x2,y1],[x2,y2],[x1,y2]];
 return q.map(([x,y],i)=>{
   const prev=q[(i+q.length-1)%q.length],next=q[(i+1)%q.length];
   return {x,y,handleIn:{x:x+(prev[0]-x)/3,y:y+(prev[1]-y)/3},
       handleOut:{x:x+(next[0]-x)/3,y:y+(next[1]-y)/3}};
 });
}
const shape={version:1,closed:true,leftEdge:ring(200,200,800,700),rightEdge:ring(100,100,900,800)};
const mask=makeKartingShapeMask(shape,1000,900);
assert.ok(mask.isOnTrack(150,500),'Should drive between borders');
assert.ok(mask.isOnTrack(500,150),'North road');
assert.ok(mask.isOnTrack(850,500),'Right road');
assert.ok(!mask.isOnTrack(500,450),'Inner grass');
assert.ok(!mask.isOnTrack(40,500),'Outer grass');
assert.ok(mask.isGrass(500,450),'Drivable inner grass with penalty');
assert.ok(mask.isGrass(40,500),'Drivable outer grass with penalty');
assert.ok(!mask.isGrass(-1,500),'Outside image is OFF');
assert.ok(!mask.isGrass(1000,500));
const editor={imageCanvas:{imageId:'test-img',width:1000,height:900,type:'image/png',size:123},trackShape:shape,isClosed:true};
const p=Array.from({length:50},(_,i)=>({x:500+320*Math.cos(i*2*Math.PI/50),y:450+260*Math.sin(i*2*Math.PI/50),width:70}));
const track={name:'TrackStudio Export',worldW:1000,worldH:900,trackWidth:70,centerline:p,closed:true,raceType:'circuit',
  finishLine:{a:{x:500,y:100},b:{x:530,y:100},normal:{x:0,y:1}},checkpoints:[],start:{x:p[0].x,y:p[0].y,r:0},trackShape:shape,grid:null};
const record=makeKartingPreviewRecord(editor,track);
assert.equal(record.track.key,LOCAL_KARTING_PREVIEW_KEY);
assert.equal(record.track.meta.localPreview,true);
assert.equal(record.track.carScale,.65);
assert.equal(record.track.grid,null);
assert.equal(record.track.start.x,p[0].x);
assert.equal(record.track.start.y,p[0].y);
assert.notEqual(record.track.start.r,0,'Start heading must follow the actual centerline tangent');
const store=new Map();
globalThis.localStorage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)};
assert.equal(getLocalKartingPreview(LOCAL_KARTING_PREVIEW_KEY),null);
store.set('tdr:trackstudio:karting-tenerife-preview-v1',JSON.stringify(record));
assert.deepEqual(getLocalKartingPreview(LOCAL_KARTING_PREVIEW_KEY),record);
assert.equal(getLocalKartingPreview('karting-tenerife'),null,'Official Karting Tenerife must never be overridden');
assert.throws(()=>makeKartingPreviewRecord({...editor,imageCanvas:null},track),/imagen/);
assert.throws(()=>makeKartingPreviewRecord(editor,{...track,finishLine:null}),/meta/);
assert.throws(()=>makeKartingPreviewRecord(editor,{...track,worldW:1001}),/dimensiones/);
const race=readFileSync('src/game/scenes/RaceScene.js','utf8');
const beauty=readFileSync('src/game/scenes/RaceWorldAlignedMaterialsScene.js','utf8');
const editorSrc=readFileSync('src/game/studio/installTrackShapeEditor.js','utf8');
assert.ok(race.includes('getLocalKartingPreview(trackKey)?.track'),'Race should resolve local DEV preview');
assert.ok(beauty.includes('applyKartingPreviewPhysics(this)'),'Custom shape is required for track physics');
assert.ok(beauty.includes('activateKartingPreviewImage(this)'),'Must use the user-owned image in the scene');
assert.ok(beauty.includes('trackId === LOCAL_KARTING_PREVIEW_KEY ? null'),'Legacy beauty tiles must not override the user image');
assert.ok(editorSrc.includes("▶ PROBAR JUEGO"),'TrackStudio needs a direct test drive action');
assert.ok(editorSrc.includes("scene.start('race',{trackKey:LOCAL_KARTING_PREVIEW_KEY})"));
console.log('Karting Tenerife local DEV test: separate key, exact independent borders, grass, spawn, isolation, valid gates: OK');
