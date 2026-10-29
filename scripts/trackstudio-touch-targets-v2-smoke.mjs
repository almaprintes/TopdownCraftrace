import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {EDITOR_CONTROL_PIXELS,worldControlRadius,pickCenterlineControl} from '../src/game/studio/trackStudioControlGeometry.js';
const node=(x,y)=>({x,y,handleIn:{x:x-120,y:y-90},handleOut:{x:x+120,y:y+90}});
const points=[node(1000,1000),node(1550,1000),node(2100,1000)];
const before=JSON.stringify(points);
for(const zoom of [.05,.23,.46,1,2.5]){
  assert.ok(Math.abs(worldControlRadius(EDITOR_CONTROL_PIXELS.node,zoom)*zoom-9)<1e-9,'Nodes render at fixed visible size');
  assert.ok(Math.abs(worldControlRadius(EDITOR_CONTROL_PIXELS.selectedNode,zoom)*zoom-12)<1e-9,'Selection size stays fixed');
  assert.deepEqual(pickCenterlineControl(points,-1,{x:points[0].x,y:points[0].y+18/zoom},zoom),{type:'node',index:0},'Finger target stays 18 screen pixels');
  assert.equal(pickCenterlineControl(points,-1,{x:points[0].x,y:points[0].y+70/zoom},zoom),null,'Distant touches must pan or create, not select');
}
const picked=pickCenterlineControl(points,1,{x:points[1].handleIn.x,y:points[1].handleIn.y},.23);
assert.deepEqual(picked,{type:'handleIn',index:1},'Only selected visible handles respond');
assert.deepEqual(pickCenterlineControl(points,-1,{x:points[1].handleIn.x,y:points[1].handleIn.y},.23),null,'Hidden handles are not interactive');
const overlap=[node(400,400),node(455,400)];
assert.deepEqual(pickCenterlineControl(overlap,-1,{x:446,y:400},.23),{type:'node',index:1},'Nearest anchor wins overlapping touch targets');
assert.equal(JSON.stringify(points),before,'Picking never edits nodes or handles');
const scene=readFileSync('src/game/scenes/TrackStudioScene.js','utf8');
const shape=readFileSync('src/game/studio/installTrackShapeEditor.js','utf8');
assert.ok(scene.includes('pickCenterlineControl(this._nodes,this._selectedNode,{x,y},this._editCam?.zoom)'),'Centerline hit testing uses camera zoom');
assert.ok(scene.includes('this._centerlineDragOffset = {')||scene.includes('this._centerlineDragOffset={'),'Keep relative finger offset to avoid geometry jumps');
const zoomMethod=scene.slice(
  scene.indexOf('_applyZoomAtViewportCenter(multiplier) {'),
  scene.indexOf('  _trackWidthStep() {',scene.indexOf('_applyZoomAtViewportCenter(multiplier) {'))
);
assert.match(zoomMethod,/if\s*\(changed\)\s*\{\s*this\._redrawEditor\(\);\s*this\._updatePanel\(\);\s*\}/,'Manual zoom refreshes control sizes when zoom changes');
assert.ok(scene.includes('if(now-(this._lastControlZoomRedraw||0)>90)'),'Pinch zoom refreshes markers without excessive redraws');
assert.ok(scene.includes('if(selected){\n        this._guideGfx.lineStyle('),'Only selected node shows Bezier handles');
assert.ok(shape.includes('if(side!==s._shapeSelected.side)continue'),'Selected edge alone shows control points');
assert.ok(shape.includes('worldControlRadius(px,zoom)'),'Border controls are also zoom-stable');
console.log('TrackStudio UX: constant screen marker size, 25px touch targets, nearest nodes, selected handles, no jump or geometry mutation: OK');
