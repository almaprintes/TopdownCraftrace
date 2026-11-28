import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildTrackStudioPortableExport,buildTrackStudioRescueJson,buildTrackStudioAiExport}
 from '../src/game/studio/trackStudioPortableExport.js';
import {unpackImageProject} from '../src/game/studio/imageCanvasProject.js';

const guides={version:1,points:Array.from({length:12},(_,i)=>({
 id:'apex-'+(i+1),x:100+i*17,y:220+i*5,radiusPx:40,
 strength:.65,kind:'apex',direction:'forward'
}))};
const meta={imageId:'photo-1',name:'foto.png',width:1000,height:600,
 type:'image/png',size:12};
const data={editor:{imageCanvas:meta,nodes:[{x:100,y:220}],aiLineGuides:guides},
 gameTrack:{name:'Santa Cruz',centerline:[{x:100,y:220}],aiLineGuides:guides}};
const png=new Blob([new Uint8Array([137,80,78,71,13,10,26,10,0,0,0,0])],{type:'image/png'});
const full=buildTrackStudioPortableExport(data,{imageBlob:png,imageMeta:meta,stamp:777});
assert.ok(full.filename.endsWith('.tdrtrack'));
assert.equal(full.guideCount,12);
assert.equal(full.imageIncluded,true);
const restored=await unpackImageProject(full.blob);
assert.equal(restored.project.editor.aiLineGuides.points.length,12);
assert.equal(restored.project.gameTrack.aiLineGuides.points.length,12);
assert.equal(restored.image.size,png.size);
const noImage={...data,editor:{nodes:data.editor.nodes,aiLineGuides:guides}};
const json=buildTrackStudioPortableExport(noImage,{stamp:777});
assert.ok(json.filename.endsWith('.json'));
assert.equal(json.guideCount,12);
assert.equal(JSON.parse(await json.blob.text()).editor.aiLineGuides.points.length,12);
const rescue=buildTrackStudioRescueJson(data,{stamp:777});
assert.ok(rescue.filename.endsWith('.json'));
assert.equal(JSON.parse(await rescue.blob.text()).gameTrack.aiLineGuides.points.length,12);
assert.throws(()=>buildTrackStudioPortableExport(data),/No se encuentra la imagen maestra/);
assert.throws(()=>buildTrackStudioPortableExport({...data,
 gameTrack:{...data.gameTrack,aiLineGuides:{version:1,points:[]}}},{imageBlob:png,imageMeta:meta}),
 /guías IA no coinciden/);
const mode=readFileSync('src/game/studio/installImageMode.js','utf8');
const chrome=readFileSync('src/game/studio/trackStudioLabChrome.js','utf8');
const dialog=readFileSync('src/game/studio/trackStudioExportDialog.js','utf8');
assert.ok(mode.includes('s._openPortableExport=(aiOnly=false)=>'));
assert.ok(mode.includes('normalizeCanvasImageBlob(row.blob,meta)'));
assert.ok(mode.includes('buildTrackStudioRescueJson(data)'));
assert.ok(!mode.includes("download(blob,'trackstudio-image-'"),
 'No deferred automatic download on GUARDAR');
assert.ok(chrome.includes("button('EXPORTAR'"));
assert.ok(chrome.includes('scene._openPortableExport?.()'));
assert.ok(dialog.includes("navigator.share({title:'Circuito TrackStudio',files:[exportFile]})"));
assert.ok(dialog.includes("download.href=activeUrl;download.download=result.filename;"));
console.log('PASS TrackStudio iPhone export: full photo and 12 AI guides, JSON rescue, explicit share/download');

const bezier={version:1,closed:true,nodes:[{x:1,y:2},{x:3,y:4},{x:5,y:6}]};
const aiData={editor:{catalogTrackId:'circuito-atlantico',aiLineGuides:guides,aiBezierLine:bezier},gameTrack:{name:'Circuito Atlántico',worldW:3040.8,worldH:2280.6,raceDirection:'forward',meta:{imageNative:{worldScale:.7}},aiLineGuides:guides,aiBezierLine:bezier}};
const ai=buildTrackStudioAiExport(aiData,{stamp:777});
const payload=JSON.parse(await ai.blob.text());
assert.equal(payload.trackId,'circuito-atlantico');assert.equal(payload.worldScale,.7);assert.deepEqual(payload.aiBezierLine,bezier);
assert.equal(payload.coordinateSpace,'published-world-px');assert.ok(!('centerline' in payload));assert.ok(!('editor' in payload));
assert.throws(()=>buildTrackStudioAiExport({...aiData,editor:{...aiData.editor,aiBezierLine:null}}),/no coinciden/);
assert.match(chrome,/EXPORTAR TRAZADA IA/);
const scene=readFileSync('src/game/scenes/TrackStudioScene.js','utf8');
const save=scene.slice(scene.indexOf('  _saveProject() {'),scene.indexOf('  _openProjectSourceMenu()'));
assert.ok(!save.includes('a.click()'));assert.ok(save.includes("writeTrackStudioWorkingCopy('trackstudio_project'"));
console.log('PASS: AI-only export and local save without download');
