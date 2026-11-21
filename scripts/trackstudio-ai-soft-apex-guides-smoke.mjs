import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizeAiLineGuides,makeAiLineGuide,modifyAiLineGuide,
 resizeAiLineGuides,AI_LINE_GUIDE_MAX} from '../src/game/studio/trackAiLineGuides.js';
import {rescaleImageTrackEditor} from '../src/game/studio/trackStudioImageScale.js';
import {packImageProject,unpackImageProject} from '../src/game/studio/imageCanvasProject.js';

const one=makeAiLineGuide(null,150,240,200);
assert.equal(one.kind,'apex');assert.equal(one.direction,'forward');
assert.equal(one.strength,.65);assert.equal(one.radiusPx,44);
let model=normalizeAiLineGuides([one]);
model=modifyAiLineGuide(model,one.id,{strength:.85,radiusPx:65,x:174});
assert.deepEqual([model.points[0].strength,model.points[0].radiusPx,model.points[0].x],[.85,65,174]);
const base={editor:{nodes:[{x:100,y:100}],aiLineGuides:model},gameTrack:{
 centerline:[{x:1,y:1}],aiLineGuides:model}};
assert.deepEqual(JSON.parse(JSON.stringify(base)).editor.aiLineGuides,model);
const meta={width:1000,height:600,type:'image/png',imageId:'test-photo'};
const next=rescaleImageTrackEditor({...base.editor,imageCanvas:meta,trackWidth:140},2000,1200);
assert.equal(next.aiLineGuides.points[0].x,348);
assert.equal(next.aiLineGuides.points[0].radiusPx,130);
assert.equal(resizeAiLineGuides(model,2,2).points[0].y,480);
assert.equal(normalizeAiLineGuides({points:[one,{id:one.id,x:10,y:10},
 {id:'bad',x:Infinity,y:20}]}).points.length,1);
assert.equal(normalizeAiLineGuides(Array.from({length:45},(_,i)=>({
 id:'apex-'+i,x:i*10,y:i*10,strength:.5,radiusPx:20
}))).points.length,AI_LINE_GUIDE_MAX);
assert.deepEqual(normalizeAiLineGuides(undefined),{version:1,points:[]});
const photo=new Blob([new Uint8Array([137,80,78,71,13,10,26,10,0])],{type:'image/png'});
const packageBlob=packImageProject({...base,editor:{...base.editor,imageCanvas:meta}},photo,meta);
const restored=await unpackImageProject(packageBlob);
assert.deepEqual(restored.project.editor.aiLineGuides,model);
assert.deepEqual(restored.project.gameTrack.aiLineGuides,model);
const scene=readFileSync('src/game/scenes/TrackStudioScene.js','utf8');
const plugin=readFileSync('src/game/studio/installTrackAiLineGuides.js','utf8');
const chrome=readFileSync('src/game/studio/trackStudioLabChrome.js','utf8');
for(const x of ['installTrackStudioAiGuides(this)',
 '_aiGuidePointerDown?.(pointer)','_aiGuidePointerMove?.(down)',
 '_aiGuidePointerUp?.(pointer,stillDown)','_aiGuidePointerCancel?.()'])
 assert.ok(scene.includes(x),'Missing touch lifecycle: '+x);
for(const x of ['_getProjectData=','_exportToGameTrack=','_applyProjectData=',
 '_importProjectOrTrack=','_newProject=','_pushHistory()',
 '_aiGuideDeleteSelected=','_aiGuideAdjustSelected='])
 assert.ok(plugin.includes(x),'Missing editor lifecycle: '+x);
for(const x of ['GUÍAS IA','FUERZA','RADIO','BORRAR GUÍA',
 'aiPanel.hidden=!editingAi'])
 assert.ok(chrome.includes(x),'Missing UI: '+x);
const online=readFileSync('src/game/online/craftraceLiveV2BotDirector.js','utf8');
assert.ok(online.includes('if(preview&&scene.track?.meta?.aiLineGuides?.points?.length)'),
 'Guide points must be read only for local Realizador preview');
console.log('PASS TrackStudio AI guides: touch, edit, undo, resize, export/import .tdrtrack; LIVE 4 unchanged');
