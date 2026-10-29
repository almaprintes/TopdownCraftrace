// Geometry-only QA for TrackStudio image replacement and native scaling.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {imageTrackResizePlan,rescaleImageTrackEditor} from '../src/game/studio/trackStudioImageScale.js';

const original={
  imageCanvas:{width:1200,height:896,imageId:'original'},
  trackWidth:45,
  nodes:[{x:100,y:200,width:50,handleIn:{x:90,y:200},handleOut:{x:110,y:210},sourceNodeIndex:2}],
  trackShape:{version:1,closed:true,leftEdge:[{x:120,y:220,handleIn:{x:116,y:217},handleOut:{x:124,y:223},sourceNodeIndex:0}],
    rightEdge:[{x:135,y:230,handleIn:{x:132,y:227},handleOut:{x:139,y:235}}]},
  startLine:{a:{x:10,y:40},b:{x:10,y:100},normal:{x:1,y:0}},
  finishLine:{a:{x:18,y:45},b:{x:18,y:110},normal:{x:0,y:-1}},
  checkpoints:[{a:{x:120,y:150},b:{x:130,y:170},normal:{x:-1,y:0}}],
  guideX:600,guideY:448,
  importedTrackMeta:{carScale:1,visualScale:1},shapeEditing:true
};
const snapshot=JSON.stringify(original);
const plan=imageTrackResizePlan(original,3600,2688);
assert.equal(plan.scale,3);
const scaled=rescaleImageTrackEditor(original,3600,2688);
assert.equal(scaled.trackWidth,135);
assert.equal(scaled.nodes[0].x,300);
assert.equal(scaled.nodes[0].width,150);
assert.deepEqual(scaled.nodes[0].handleOut,{x:330,y:630});
assert.deepEqual(scaled.trackShape.leftEdge[0].handleIn,{x:348,y:651});
assert.deepEqual(scaled.startLine.a,{x:30,y:120});
assert.deepEqual(scaled.finishLine.b,{x:54,y:330});
assert.deepEqual(scaled.checkpoints[0].b,{x:390,y:510});
assert.deepEqual(scaled.checkpoints[0].normal,{x:-1,y:0});
assert.equal(scaled.guideX,1800);
assert.equal(scaled.guideY,1344);
assert.equal(scaled.importedTrackMeta.carScale,1);
assert.equal(JSON.stringify(original),snapshot,'Do not mutate active original/history');
assert.notStrictEqual(scaled.trackShape,original.trackShape);
assert.notStrictEqual(scaled.nodes[0],original.nodes[0]);
const same=rescaleImageTrackEditor(original,1200,896);
assert.equal(same.trackWidth,45,'Image replacement at same size changes no geometry');
assert.throws(()=>imageTrackResizePlan(original,3600,2500),/proporciones distintas/);
assert.throws(()=>imageTrackResizePlan(original,9000,6719),/8192/);
assert.throws(()=>imageTrackResizePlan(original,7000,5600),/32 MP/);
assert.throws(()=>imageTrackResizePlan({imageCanvas:null},3600,2688),/primero/);
const mode=fs.readFileSync('src/game/studio/installImageMode.js','utf8');
assert.ok(mode.includes("const next={...rescaleImageTrackEditor(current,plan.width,plan.height),imageCanvas:meta}"));
assert.ok(mode.includes("s._suspendImageRestore=true"));
assert.ok(mode.includes("await saveCanvasImage(meta.imageId,file,meta)"));
assert.ok(mode.includes("s._openCanvasImagePicker=()=>"));
assert.ok(mode.includes("add('SUSTITUIR FOTO'"));
assert.ok(mode.includes("for(const factor of [2,2.5,3])"));
assert.ok(mode.includes("await replaceCanvasImage(s,file)"));
assert.ok(mode.includes("customButton.textContent='APLICAR ESCALA'"));
assert.ok(mode.includes("Math.round(current.imageCanvas.width*factor)"));
assert.ok(mode.includes("if(!s._imageCanvas?.imageId)return newMap()"));
console.log('PASS Track Studio image scale: 1:1, x3 geometry, bezier controls, edges, gates, normals, undo immutability, same-size replacement, bad aspect and size guards');
