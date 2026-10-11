import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { shapeInspectorCopy, createShapeDomInspector } from '../src/game/studio/shapeDomInspector.js';
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
const mod=readFileSync('src/game/studio/installTrackShapeEditor.js','utf8');
const section=mod.slice(mod.indexOf('const originalPanel=s._updatePanel.bind(s)'),mod.indexOf('s._findShapeControlAt='));
assert.ok(section.includes('return originalPanel();'),'Standard centerline editor must retain legacy inspector');
assert.ok(section.includes('inspector.show(shapeInspectorCopy('),'Shape editing must use HTML inspector');
assert.ok(!section.includes('.setText('),'Shape inspector must NEVER use Phaser Text.setText');
assert.ok(!mod.includes('editBtn.setText('),'AJUSTAR must never resize a Phaser text texture');
console.log('TrackStudio iOS crash regression: DOM inspector, no Phaser setText on selection, resize + cleanup: OK');
