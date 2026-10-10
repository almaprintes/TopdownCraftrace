import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { packImageProject, unpackImageProject } from '../src/game/studio/imageCanvasProject.js';

const meta = { imageId:'image-test',name:'sample.webp',type:'image/webp',width:4096,height:3072,size:8 };
const track = { editor:{imageCanvas:meta,nodes:[{x:1024,y:768},{x:2048,y:1536}]},gameTrack:{worldW:4096,worldH:3072,centerline:[{x:1024,y:768},{x:2048,y:1536}]} };
const pixels = new Blob(['WEBPTEST'],{type:'image/webp'});
const blob = packImageProject(track,pixels,meta);
const imported = await unpackImageProject(blob);
assert.deepEqual(imported.project.editor.nodes,track.editor.nodes);
assert.deepEqual(imported.project.gameTrack.centerline,track.gameTrack.centerline);
assert.equal(imported.project.editor.imageCanvas.width,4096);
assert.equal(await imported.image.text(),'WEBPTEST');
await assert.rejects(unpackImageProject(new Blob(['bad file'])),/TrackStudio Image/);
const source=readFileSync('src/game/scenes/TrackStudioScene.js','utf8');
const mode=readFileSync('src/game/studio/installImageMode.js','utf8');
for(const fragment of ['installTrackStudioImageMode(this)','importImageProjectFile(this, file)','this._imageCanvas ? 0.16 : 0.95']){
  assert.ok(source.includes(fragment),'Missing TrackStudio integration: '+fragment);
}
for(const fragment of ['_editorWorldW=w','_editorWorldH=h','ctx.drawImage(img,x,y,tw,th,0,0,tw,th)','setOrigin(0,0)','saveCanvasImage','_getProjectData','_saveProject']){
  assert.ok(mode.includes(fragment),'Missing native-canvas invariant: '+fragment);
}
console.log('TrackStudio Image Mode: package roundtrip, coordinate invariants and integration checks OK');
