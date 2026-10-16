import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  createTrackShape, shapeIsValid, sampleShapeEdge,
  splitShapeEdge, moveShapePart, copyTrackShape,
  nodeRoadWidth,interpolateRoadWidth,adjustShapeWidthAtNode
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
// Local widths affect both road edges without moving the centerline.
const authored=nodes.map(n=>JSON.parse(JSON.stringify(n)));
authored[4].width=120;
const tapered=createTrackShape(authored,70,true);
const sep=(shape,i)=>Math.hypot(
  shape.rightEdge[i].x-shape.leftEdge[i].x,
  shape.rightEdge[i].y-shape.leftEdge[i].y
);
assert.ok(Math.abs(sep(tapered,4)-120)<1e-6,'Selected node gets requested physical road width');
assert.ok(Math.abs(sep(tapered,3)-70)<1e-6,'Other nodes retain their widths');
assert.equal(nodeRoadWidth(authored[3],70),70);
assert.equal(nodeRoadWidth(authored[4],70),120);
assert.equal(interpolateRoadWidth(authored[3],authored[4],0,70),70);
assert.equal(interpolateRoadWidth(authored[3],authored[4],0.5,70),95);
assert.equal(interpolateRoadWidth(authored[3],authored[4],1,70),120);
assert.ok(interpolateRoadWidth(authored[3],authored[4],.2,70)<interpolateRoadWidth(authored[3],authored[4],.4,70));
assert.equal(JSON.stringify(nodes),originalNodes,'Local width changes never mutate original centerline');
// Manual edge changes are preserved: each delta translates ONLY one anchor
// and its handles on each side; the rest of the customized outline stays put.
const manual=createTrackShape(nodes,70,true);
moveShapePart(manual,'leftEdge',4,'handleOut',{
  x:manual.leftEdge[4].handleOut.x-7,y:manual.leftEdge[4].handleOut.y+8
});
const beforeShape=copyTrackShape(manual);
assert.equal(adjustShapeWidthAtNode(manual,nodes,4,15),true);
assert.ok(Math.abs(sep(manual,4)-85)<1e-6);
assert.deepEqual(manual.leftEdge[3],beforeShape.leftEdge[3]);
assert.deepEqual(manual.rightEdge[5],beforeShape.rightEdge[5]);
const movedHandle=manual.leftEdge[4].handleOut;
const priorHandle=beforeShape.leftEdge[4].handleOut;
assert.ok(Math.hypot(movedHandle.x-priorHandle.x,movedHandle.y-priorHandle.y)>7,
  'Customized handle moves by the width delta, it is not rebuilt');
assert.equal(adjustShapeWidthAtNode(manual,nodes,4,-15),true);
assert.ok(Math.hypot(manual.leftEdge[4].handleOut.x-priorHandle.x,manual.leftEdge[4].handleOut.y-priorHandle.y)<1e-6,
  'Reset exactly restores previously customized border geometry');
// Subdivision retains original node identity, even when sides have different lengths.
const split=createTrackShape(nodes,70,true);
splitShapeEdge(split.leftEdge,2,true);
assert.equal(adjustShapeWidthAtNode(split,nodes,4,10),true);
assert.ok(Math.abs(sep(split,0)-70)<1e-6,'Unaffected anchors stay fixed after a split');
assert.equal(split.leftEdge.find(p=>p.sourceNodeIndex===4).sourceNodeIndex,4);
assert.ok(shapeIsValid(split));

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
assert.ok(editor.includes("s._setLocalNodeWidth=(value)=>"),'Local width action must exist');
assert.ok(editor.includes("adjustShapeWidthAtNode(s._trackShape,s._nodes,index,next-original)"),'Existing shape must be updated without regeneration');
assert.ok(editor.includes("s._autosaveRecovery()"),'Local edits must survive reload');
assert.ok(studio.includes("interpolateRoadWidth(a,b,k/28,this._trackWidth)"),'Rendered road and export must interpolate local width');
assert.ok(studio.includes("width: Number.isFinite(p.width)&&p.width>0?p.width:this._trackWidth"),'Export must include actual local widths');
console.log('TrackStudio Phase B: 30 nodes, independent Bezier edges, handles, exact subdivision, snapshot/save/undo wiring: OK');
