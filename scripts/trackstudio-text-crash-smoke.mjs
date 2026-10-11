import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { shapeInspectorCopy, createShapeDomInspector, studioInspectorCopy } from '../src/game/studio/shapeDomInspector.js';
let node=null,removed=0,added=0;
const listeners=new Map();
globalThis.document={
  body:{appendChild(n){node=n;added++}},
  createElement(tag){
    assert.equal(tag,'div');
    return {style:{},textContent:'',setAttribute(){},remove(){removed++}};
  }
};
globalThis.window={
  addEventListener(key,cb){listeners.set(key,cb)},
  removeEventListener(key){listeners.delete(key)}
};
const scene={
  scale:{width:1500,height:840},
  game:{canvas:{getBoundingClientRect(){return {left:10,top:20,width:900,height:504}}}},
  _rightPanelW:280,_panelContentY:140
};
const inspector=createShapeDomInspector(scene);
assert.equal(added,1);
assert.equal(listeners.size,2);
const shape={
  leftEdge:[{x:100,y:101,handleIn:{x:90,y:90},handleOut:{x:110,y:110}}],
  rightEdge:[{x:300,y:301,handleIn:{x:290,y:290},handleOut:{x:310,y:310}}]
};
const txt=shapeInspectorCopy(shape,{side:'leftEdge',index:0});
assert.ok(txt.includes('BORDE IZQUIERDO')&&txt.includes('100')&&txt.includes('101'));
inspector.show(txt);
assert.equal(node.textContent,txt);
assert.equal(node.style.display,'block');
assert.ok(node.style.left.endsWith('px'));
assert.ok(node.style.width.endsWith('px'));
scene._panelContentY=180;
listeners.get('resize')();
assert.ok(parseFloat(node.style.top)>90,'DOM position must track canvas scaling');
inspector.show(shapeInspectorCopy(shape,null));
assert.ok(node.textContent.includes('AJUSTAR BORDES'));
inspector.hide();
assert.equal(node.style.display,'none');
inspector.destroy();
assert.equal(listeners.size,0);
assert.equal(removed,1);
const editor=readFileSync('src/game/studio/installTrackShapeEditor.js','utf8');
const studio=readFileSync('src/game/scenes/TrackStudioScene.js','utf8');
const region=editor.slice(editor.indexOf('const inspector=createShapeDomInspector(s)'),editor.indexOf('s._findShapeControlAt='));
const corePanel=studio.slice(studio.indexOf('\n  _updatePanel() {'),studio.indexOf('\n  _getProjectData() {'));
assert.ok(region.includes('inspector.show(edgeMode'),'All inspector branches must use HTML');
assert.ok(region.includes('studioInspectorCopy(s)'),'Centerline, piano and empty selection must use HTML');
assert.ok(region.includes('shapeInspectorCopy(s._trackShape,s._shapeSelected)'),'Shape edit must use HTML');
assert.ok(!region.includes('originalPanel()'),'Core Phaser text panel must never be called');
assert.ok(!region.includes('.setText('),'Inspector must not call Phaser Text.setText');
assert.ok(!corePanel.includes('.setText('),'Original editor method must no longer generate Text UVs');
assert.ok(!editor.includes('editBtn.setText('),'Toggle must avoid updating Phaser Text');
const data={
  _nodes:[{x:12,y:18,handleIn:{x:10,y:18},handleOut:{x:15,y:19}}],
  _pianos:[],_checkpoints:[{a:{x:1,y:2},b:{x:3,y:4}}],
  _editCam:{zoom:.65},_trackWidth:70,_guideVisible:true,
  _selectedNode:0,_selectedPiano:-1,_selectedPart:{type:'node'},
  _imageCanvas:{width:1672,height:941},_startLine:null,_finishLine:null,
  _isClosed:true
};
assert.ok(studioInspectorCopy(data).includes('Nodo #0'),'Legacy node inspection must remain visible');
data._selectedNode=-1;
assert.ok(studioInspectorCopy(data).includes('Lienzo: 1672×941'),'Empty inspector must show image and world');
assert.ok(studioInspectorCopy(data).includes('Checkpoints: 1'));
data._pianos=[{a:{x:1,y:2},b:{x:3,y:4},point:{x:2,y:3}}];
data._selectedPiano=0;
assert.ok(studioInspectorCopy(data).includes('Piano #0'),'Legacy piano info must remain visible');
console.log('TrackStudio iOS crash regression: no Phaser Text updates on ANY panel path; all modes DOM + cleanup OK');
