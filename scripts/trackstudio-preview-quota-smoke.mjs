// Reproduces iPhone Safari localStorage QuotaExceededError while launching
// a user-authored vector Bézier (large karting, preview + recovery).
// Never clear or rewrite unrelated browser keys to make room.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {writeTrackStudioWorkingCopy,readTrackStudioWorkingCopy,
 readTrackStudioWorkingCopies}
 from '../src/game/studio/trackStudioPreviewStorage.js';
import {installKartingPreview,getLocalKartingPreview,
 LOCAL_STUDIO_VECTOR_PREVIEW_KEY} from '../src/game/tracks/localKartingPreview.js';

class MockStorage{
 constructor(quota){this.quota=quota;this.values=new Map();}
 getItem(k){return this.values.get(String(k))??null;}
 setItem(k,v){
  const next=new Map(this.values);
  next.set(String(k),String(v));
  const length=[...next].reduce((n,[k,val])=>n+2*(k.length+val.length),0);
  if(length>this.quota)throw new DOMException(
   'The quota has been exceeded.','QuotaExceededError');
  this.values=next;
 }
 removeItem(k){this.values.delete(String(k));}
 key(i){return [...this.values.keys()][i]||null;}
 get length(){return this.values.size;}
 clear(){throw Error('TrackStudio must never erase browser data');}
}

const local=new MockStorage(18000),session=new MockStorage(8_000_000);
Object.defineProperty(globalThis,'localStorage',{configurable:true,value:local});
Object.defineProperty(globalThis,'sessionStorage',{configurable:true,value:session});
local.setItem('tdr:account:do-not-touch','preserve-user-account');
local.setItem('tdr:other-app','X'.repeat(8700));
const key='tdr:trackstudio:vector-director-preview-v1';
const edge=pts=>pts.map(([x,y])=>({
 x,y,handleIn:{x,y},handleOut:{x,y}
}));
const shape={version:1,closed:true,
 leftEdge:edge([[400,380],[900,380],[900,840],[400,840]]),
 rightEdge:edge([[455,435],[845,435],[845,785],[455,785]])};
const centerline=Array.from({length:2800},(_,i)=>{
 const t=i/2800*2*Math.PI;
 return {x:650+210*Math.cos(t),y:610+210*Math.sin(t),width:100};
});
const bezier={version:1,closed:true,nodes:[
 {x:860,y:610},{x:650,y:820},{x:440,y:610},{x:650,y:400}
].map(p=>({...p,handleIn:{...p},handleOut:{...p}}))};
const editor={isClosed:true,trackShape:shape,imageCanvas:null};
const track={name:'Karting Tenerife',worldW:1600,worldH:1200,
 centerline,trackShape:shape,trackWidth:100,closed:true,
 finishLine:{a:{x:860,y:580},b:{x:860,y:640}},
 aiBezierLine:bezier};
const scene={_getProjectData:()=>editor,_exportToGameTrack:()=>track};

const record=await installKartingPreview(scene,{allowVectorOnly:true});
assert.equal(record.track.aiBezierLine.nodes.length,4);
assert.equal(local.getItem(key),null,
 'A quota-full localStorage cannot hold this large preview');
assert.ok(session.getItem(key),
 'A large preview should be stored in the temporary session');
const recovered=getLocalKartingPreview(LOCAL_STUDIO_VECTOR_PREVIEW_KEY);
assert.ok(recovered,'The exact preview must be readable by the race scene');
assert.equal(recovered.track.centerline.length,2800);
assert.deepEqual(recovered.track.aiBezierLine,bezier,
 'The authored line remains bit-for-bit identical');
assert.equal(local.getItem('tdr:account:do-not-touch'),'preserve-user-account');
assert.equal(local.getItem('tdr:other-app'),'X'.repeat(8700));

const recovery={editor:{
 nodes:edge([[10,11],[50,51],[90,91]]),aiBezierLine:bezier
}};
assert.equal(writeTrackStudioWorkingCopy('trackstudio_recovery',
 JSON.stringify(recovery)),'session');
assert.deepEqual(JSON.parse(readTrackStudioWorkingCopy('trackstudio_recovery')),
 recovery,'Return to editor restores authored Bézier after quota exception');

// A corrupted temporary record should not hide an older, healthy local copy.
const candidateKey='tdr:test:storage-corruption';
local.setItem(candidateKey,'{"valid":true}');
session.setItem(candidateKey,'broken');
assert.deepEqual(readTrackStudioWorkingCopies(candidateKey),
 ['broken','{"valid":true}']);

// A successful persistent write invalidates a previous tab-only fallback.
session.setItem('tdr:test:small','outdated');
assert.equal(writeTrackStudioWorkingCopy('tdr:test:small','fresh'),'local');
assert.equal(readTrackStudioWorkingCopy('tdr:test:small'),'fresh');
assert.equal(session.getItem('tdr:test:small'),null);

// If both stores are full, do not pretend the preview was saved.
session.quota=1000;
assert.rejects(()=>installKartingPreview(scene,{allowVectorOnly:true}),
 /Sin espacio para la vista previa o recuperación/);
assert.equal(local.getItem('tdr:account:do-not-touch'),'preserve-user-account');
assert.equal(local.getItem('tdr:other-app'),'X'.repeat(8700));

const source=readFileSync('src/game/scenes/TrackStudioScene.js','utf8');
const preview=readFileSync('src/game/studio/installTrackShapeEditor.js','utf8');
assert.ok(source.includes("readTrackStudioWorkingCopy('trackstudio_recovery')"),
 'Returning from the race must respect session-only recovery');
assert.ok(source.includes("writeTrackStudioWorkingCopy('trackstudio_project',JSON.stringify(data))"),
 'Storage project copy must be compact, file export stays formatted');
assert.ok(source.includes("this._autosaveRecovery()"),
 'Saving must preserve an editor-only recovery');
assert.ok(preview.includes("if(s._autosaveRecovery?.()===false)"),
 'Do not navigate to race without a recoverable editor snapshot');
console.log('PASS Safari localStorage quota: preview launches through sessionStorage, exact Bézier and unrelated data preserved, safe recovery');
