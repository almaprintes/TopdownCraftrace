import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  packImageProject, unpackImageProject, looksLikeImageProject, normalizeCanvasImageBlob
} from '../src/game/studio/imageCanvasProject.js';

// Minimal binary with a valid WebP file signature (enough for package testing).
const imageBytes=new Uint8Array([82,73,70,70,12,0,0,0,87,69,66,80,86,80,56,32,0,0,0,0]);
const pixels=new Blob([imageBytes],{type:'image/webp'});
const meta={imageId:'image-test',name:'sample.webp',type:'image/webp',width:4096,height:3072,size:pixels.size};
const track={
  editor:{imageCanvas:meta,nodes:[{x:1024,y:768},{x:2048,y:1536}],trackShape:{
    version:1,closed:false,leftEdge:[],rightEdge:[]
  }},
  gameTrack:{worldW:4096,worldH:3072,centerline:[{x:1024,y:768},{x:2048,y:1536}]}
};
const blob=packImageProject(track,pixels,meta);
assert.equal(await looksLikeImageProject(blob),true);
assert.equal(await looksLikeImageProject(pixels),false);
const imported=await unpackImageProject(blob);
assert.deepEqual(imported.project.editor.nodes,track.editor.nodes);
assert.deepEqual(imported.project.gameTrack.centerline,track.gameTrack.centerline);
assert.equal(imported.project.editor.imageCanvas.width,4096);
assert.equal(imported.repairedNested,false);
assert.deepEqual(new Uint8Array(await imported.image.arrayBuffer()),imageBytes);

// Real bug regression: file named .tdrtrack but its "image" is another whole
// .tdrtrack. The outer manifest correctly declares the original PNG/WebP size.
// The importer must unwrap the inner package and keep the OUTER editing geometry.
const outerProject={
  ...track,
  editor:{...track.editor,nodes:[...track.editor.nodes,{x:3500,y:2444}]},
  imageAsset:{...meta,size:pixels.size}
};
const json=new TextEncoder().encode(JSON.stringify(outerProject));
const corruptNested=new Blob([
  'TDR-IMAGE-PROJECT-V1\n'+json.length+'\n',json,blob
],{type:'application/octet-stream'});
const fixed=await unpackImageProject(corruptNested);
assert.equal(fixed.repairedNested,true);
assert.equal(fixed.project.editor.nodes.length,3);
assert.equal(fixed.image.size,pixels.size);
assert.deepEqual(new Uint8Array(await fixed.image.arrayBuffer()),imageBytes);
const repairedCanvas=await normalizeCanvasImageBlob(blob,meta);
assert.equal(repairedCanvas.nested,1);
assert.equal(repairedCanvas.blob.size,pixels.size);
await assert.rejects(unpackImageProject(new Blob(['bad file'])),/no es un paquete/i);
const truncated=new Blob(['TDR-IMAGE-PROJECT-V1\n30\nx']);
await assert.rejects(unpackImageProject(truncated),/incompleto/i);
await assert.rejects(normalizeCanvasImageBlob(new Blob(['not an image']),meta),/no contiene una imagen/i);
await assert.rejects(normalizeCanvasImageBlob(pixels,{...meta,size:5}),/tamaño guardado/i);

const scene=readFileSync('src/game/scenes/TrackStudioScene.js','utf8');
const mode=readFileSync('src/game/studio/installImageMode.js','utf8');
for(const fragment of [
  'installTrackStudioImageMode(this)','importImageProjectFile(this, file)',
  'this._imageCanvas ? 0.16 : 0.95','looksLikeImageProject(file)',
  "Error al abrir: "
])assert.ok(scene.includes(fragment),'Missing importer integration: '+fragment);
for(const fragment of [
  '_editorWorldW=w','_editorWorldH=h','ctx.drawImage(img,x,y,tw,th,0,0,tw,th)',
  'setOrigin(0,0)','saveCanvasImage','_getProjectData','_saveProject',
  'normalizeCanvasImageBlob(row.blob,s._imageCanvas)'
])assert.ok(mode.includes(fragment),'Missing image / repair invariant: '+fragment);
console.log('TrackStudio Image Mode: valid image, nested legacy recovery, header sniff, preserve outer geometry, reject bad files, editor integration: OK');
