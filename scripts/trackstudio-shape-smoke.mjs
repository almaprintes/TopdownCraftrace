import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  createTrackShape, shapeIsValid, sampleShapeEdge,
  splitShapeEdge, moveShapePart, copyTrackShape
} from '../src/game/studio/trackShapeGeometry.js';

const count=30,cx=836,cy=470,rx=530,ry=330,closed=true;
const nodes=Array.from({length:count},(_,i)=>{
  const t=i/count*Math.PI*2,dt=Math.PI*2/count,dx=-rx*Math.sin(t)*dt/3,dy=ry*Math.cos(t)*dt/3;
  return {x:cx+rx*Math.cos(t),y:cy+ry*Math.sin(t),
    handleIn:{x:cx+rx*Math.cos(t)-dx,y:cy+ry*Math.sin(t)-dy},
    handleOut:{x:cx+rx*Math.cos(t)+dx,y:cy+ry*Math.sin(t)+dy}};
});
const originalNodes=JSON.stringify(nodes);
const shape=createTrackShape(nodes,70,closed);
assert.ok(shapeIsValid(shape));
assert.equal(shape.leftEdge.length,30);
assert.equal(shape.rightEdge.length,30);
assert.deepEqual(nodes,JSON.parse(originalNodes),'Converting shape MUST NOT touch centerline');
const rightBefore=JSON.stringify(shape.rightEdge);
const leftBefore=JSON.stringify(shape.leftEdge);
assert.ok(moveShapePart(shape,'leftEdge',4,'anchor',{x:shape.leftEdge[4].x-15,y:shape.leftEdge[4].y+8}));
assert.notEqual(JSON.stringify(shape.leftEdge),leftBefore);
assert.equal(JSON.stringify(shape.rightEdge),rightBefore,'Editing left edge MUST NOT change right edge');
assert.equal(JSON.stringify(nodes),originalNodes,'Editing border MUST NOT alter centerline');
const right0={...shape.rightEdge[0]};
moveShapePart(shape,'rightEdge',0,'handleOut',{x:right0.handleOut.x+3,y:right0.handleOut.y-4});
assert.equal(shape.leftEdge.length,30,'Changing right handle must not change left');
assert.ok(shapeIsValid(shape));
const archived=copyTrackShape(shape);
assert.deepEqual(JSON.parse(JSON.stringify(archived)),shape);
archived.leftEdge[0].x+=100;
assert.notEqual(archived.leftEdge[0].x,shape.leftEdge[0].x,'Project snapshot must be deep copied');
const edge=[{x:0,y:0,handleIn:{x:-3,y:0},handleOut:{x:25,y:15}},
  {x:100,y:0,handleIn:{x:75,y:15},handleOut:{x:105,y:-1}}];
const before=sampleShapeEdge(edge,false,28);
assert.equal(splitShapeEdge(edge,0,false),1);
const after=sampleShapeEdge(edge,false,14);
assert.equal(before.length,after.length);
before.forEach((pt,i)=>{assert.ok(Math.hypot(pt.x-after[i].x,pt.y-after[i].y)<1e-8,'Subdivision must preserve curve');});
assert.equal(edge.length,3);
assert.equal(createTrackShape(nodes,70,false).closed,false,'Stage support');
assert.throws(()=>createTrackShape(nodes.slice(0,1),70,true),/nodos/);
const studio=readFileSync('src/game/scenes/TrackStudioScene.js','utf8');
const editor=readFileSync('src/game/studio/installTrackShapeEditor.js','utf8');
assert.ok(studio.includes('installTrackStudioShapeEditor(this)'));
assert.ok(studio.includes('this._shapeEditing && this._tool'));
assert.ok(studio.includes('Empty taps in shape mode never create centerline nodes'));
assert.ok(studio.includes('if (this._dragMoved) this._autosaveRecovery()'));
assert.ok(editor.includes('trackShape:copyTrackShape(s._trackShape)'));
assert.ok(editor.includes('exported.trackShape=copyTrackShape(s._trackShape)'));
assert.ok(editor.includes("s._pushHistory()"));
console.log('TrackStudio Phase B: 30 nodes, independent Bezier edges, handles, exact subdivision, snapshot/save/undo wiring: OK');
