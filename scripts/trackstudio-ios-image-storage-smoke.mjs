import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {encodeCanvasImageRecord,decodeCanvasImageRecord,saveCanvasImage,readCanvasImage,
  packImageProject} from '../src/game/studio/imageCanvasProject.js';
import {repairImageNativePhoto} from '../src/game/tracks/imageNativeRaceLoader.js';

const imageBytes=Uint8Array.from([82,73,70,70,12,0,0,0,87,69,66,80,86,80,56,32,0,0,0,0]);
const photo=new Blob([imageBytes],{type:'image/webp'});
const meta={imageId:'karting-photo',type:'image/webp',size:photo.size,width:1000,height:900};
const encoded=await encodeCanvasImageRecord(meta.imageId,photo,meta);
assert.ok(encoded.bytes instanceof Uint8Array,'Persist bytes rather than an OS-backed Blob');
assert.equal(encoded.blob,undefined,'Must not store Blob in IndexedDB');
assert.equal(encoded.bytes.byteLength,photo.size);
const hydrated=await decodeCanvasImageRecord(encoded);
assert.equal(hydrated.legacy,false);
assert.deepEqual(new Uint8Array(await hydrated.blob.arrayBuffer()),imageBytes);
assert.equal(hydrated.blob.type,'image/webp');

const legacy=await decodeCanvasImageRecord({blob:photo,meta});
assert.equal(legacy.legacy,true,'Legacy Blob record remains readable and migratable');
const broken=new Blob([imageBytes],{type:'image/webp'});
broken.arrayBuffer=async()=>{throw new Error('The object can not be found here.')};
await assert.rejects(decodeCanvasImageRecord({blob:broken,meta}),/fotografía guardada.*ya no se puede leer/i);
await assert.rejects(encodeCanvasImageRecord('',photo,meta),/inválida/);

const rows=new Map();
const db={
  close(){},transaction(name,mode){
    assert.equal(name,'images');
    const tx={
      oncomplete:null,onerror:null,onabort:null,
      objectStore(){return {
        get(id){
          const req={result:undefined,onsuccess:null};
          queueMicrotask(()=>{req.result=rows.get(id);req.onsuccess?.();queueMicrotask(()=>tx.oncomplete?.())});
          return req;
        },
        put(value,id){
          const req={result:id,onsuccess:null};
          queueMicrotask(()=>{rows.set(id,value);req.onsuccess?.();queueMicrotask(()=>tx.oncomplete?.())});
          return req;
        }
      }}
    };
    return tx;
  }
};
globalThis.indexedDB={
  open(){
    const request={onsuccess:null,onerror:null,onupgradeneeded:null};
    queueMicrotask(()=>{request.result=db;request.onsuccess?.()});
    return request;
  }
};
await saveCanvasImage(meta.imageId,photo,meta);
assert.ok(rows.get(meta.imageId).bytes instanceof Uint8Array);
assert.deepEqual(new Uint8Array(await (await readCanvasImage(meta.imageId)).blob.arrayBuffer()),imageBytes);
rows.set(meta.imageId,{blob:photo,meta});
assert.equal((await readCanvasImage(meta.imageId)).blob.size,photo.size);
assert.equal(rows.get(meta.imageId).blob,undefined,'Reading legacy records migrates to stable bytes');

rows.set(meta.imageId,{blob:broken,meta});
const brokenBefore=rows.get(meta.imageId);
await assert.rejects(readCanvasImage(meta.imageId),/fotografía guardada.*ya no se puede leer/i);
assert.equal(rows.get(meta.imageId),brokenBefore,'Unreadable record is never destroyed');

// Recovery matches the authored photo: same format, byte size and dimensions,
// and writes only its imageId; the active centerline/track stays unchanged.
globalThis.Image=class {
  constructor(){this.naturalWidth=1000;this.naturalHeight=900;this.onload=null;this.onerror=null;}
  set src(url){if(url)queueMicrotask(()=>this.onload?.())}
};
const desc={type:'local',imageId:meta.imageId,imageMeta:meta,width:1000,height:900,
  track:{worldW:1000,worldH:900,centerline:[{x:1,y:2}],trackShape:{leftEdge:[],rightEdge:[]}}};
const before=JSON.stringify(desc.track);
const packet=packImageProject({editor:{imageCanvas:meta,nodes:[{x:500,y:500}]}},photo,meta);
await repairImageNativePhoto(desc,packet);
assert.equal(JSON.stringify(desc.track),before,'Restoring from .tdrtrack must not replace geometry');
assert.deepEqual(new Uint8Array(await (await readCanvasImage(meta.imageId)).blob.arrayBuffer()),imageBytes);
const stable=rows.get(meta.imageId);
await assert.rejects(repairImageNativePhoto(desc,new Blob(['not a picture'])),/imagen/i);
assert.equal(rows.get(meta.imageId),stable,'Invalid photo cannot overwrite the repaired image');

const src=readFileSync('src/game/tracks/imageNativeRaceLoader.js','utf8');
assert.ok(src.includes('RECUPERAR FOTOGRAFÍA'));
assert.ok(src.includes('scene.scene.restart({trackKey:key})'),'After repair restart only the current race');
assert.ok(src.includes('await saveCanvasImage(desc.imageId,blob,desc.imageMeta)'),'Same imageId, no geometry import');
assert.ok(src.includes('if(img.naturalWidth!==desc.width||img.naturalHeight!==desc.height)'));
console.log('TrackStudio iOS image persistence and photo-only restoration: bytes, migration, broken Blob, .tdrtrack recovery and geometry isolation OK');
