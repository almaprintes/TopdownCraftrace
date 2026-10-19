import assert from 'node:assert/strict';
import fs from 'node:fs';
import {EDITOR_EDGE_PAN_PX,editorCameraPanBounds,
  scrollForTwoFingerMapGesture,clampEditorScroll} from '../src/game/environment/environmentMapNavigation.js';
const layer=fs.readFileSync('src/game/scenes/EnvironmentBuilderAmericasImportScene.js','utf8');
assert.ok(!layer.includes('DEV 1.2.225 · A→B CANVAS 2D'),
  'Old green diagnostic overlay must be absent in editor');
assert.ok(!layer.includes('node.textContent='),
  'A→B status metrics should not render across the photograph');
assert.ok(layer.includes("querySelector('[data-stage-render-state]')?.remove?.()"),
  'Any old diagnostic node must be cleaned up');
assert.ok(layer.includes('this.game.scene.stop(key)'),
  'Other racing scenes must not paint over editor');
assert.ok(layer.includes('_openRealTrack(trackId,resetProject=true)'),
  'Switching tracks continues to synchronize the UI');
const track=JSON.parse(fs.readFileSync(
  'src/game/tracks/library/rally-arafo-los-loros/track.json','utf8'));
const points=track.centerline;
const maxEdge=points.slice(1).reduce((n,p,i)=>
  Math.max(n,Math.hypot(p.x-points[i].x,p.y-points[i].y)),0);
assert.ok(maxEdge<50,'Arafo author points still connected, no closing diagonal');

const pan=fs.readFileSync('src/game/scenes/EnvironmentBuilderPinchAnchorScene.js','utf8');
const freePan=fs.readFileSync('src/game/scenes/EnvironmentBuilderFreePanScene.js','utf8');
const collisions=fs.readFileSync('src/game/scenes/EnvironmentBuilderCollisionWorkflowScene.js','utf8');
assert.ok(pan.includes('this.input.addPointer(2)'), '2 touch pointers remain available');
assert.ok(pan.includes('filter(p=>p?.isDown).slice(0,2)'),
  'An initiated gesture must survive crossing editor viewport edges');
assert.ok(pan.includes("this._mode==='select'&&selected?._env"),
  'Map gestures must not transform selected assets in collision mode');
assert.ok(pan.includes('scrollForTwoFingerMapGesture('),
  'Pinch + pan use the same continuous midpoint transform');
assert.ok(pan.includes('this._clampEditorPan();'),
  'Camera retains padded boundaries on touch release and on button zoom');
assert.ok(pan.includes('_fitRealTrack(){') &&
  pan.includes('super._fitRealTrack();'),
  'Every track refit must resynchronize camera padding with its zoom');
assert.ok(freePan.includes('const b=cam?._bounds'),
  'Single finger select-mode free pan respects the same widened real camera bounds');
assert.ok(collisions.includes('this._penDraft.nodes.pop()') &&
  collisions.includes('this._zoneDraft.length=z.start'),
  'Joining with a second finger rolls back a provisional pen/zone stroke');
const pen=fs.readFileSync('src/game/scenes/EnvironmentBuilderCollisionPenScene.js','utf8');
assert.ok(pen.includes('const originalNodes=JSON.parse(JSON.stringify(hit.line.nodes))') &&
  collisions.includes('g.line.nodes=g.originalNodes'),
  'Second finger must restore existing Bézier anchors, handles and inserted nodes');
assert.ok(collisions.includes('this._zoneSelected.points=z.original'),
  'Second finger must restore already-dragged collision-zone vertices');

assert.equal(EDITOR_EDGE_PAN_PX,112);
const bounds=editorCameraPanBounds(1882,3344,900,550,2);
assert.equal(bounds.minX,-56);
assert.equal(bounds.minY,-56);
assert.equal(bounds.maxX,1882+56-450);
assert.equal(bounds.maxY,3344+56-275);
assert.ok(bounds.width>1882&&bounds.height>3344,
  'Real Phaser setBounds must include overscroll, not just JS clamp');
const rightEdge=clampEditorScroll(Infinity,Infinity,bounds);
assert.deepEqual(rightEdge,{x:bounds.maxX,y:bounds.maxY});
assert.deepEqual(clampEditorScroll(-Infinity,-Infinity,bounds),
  {x:bounds.minX,y:bounds.minY});

const from={x:340,y:260}, to={x:400,y:290};
const move=scrollForTwoFingerMapGesture(700,900,100,60,from,to,2,2);
assert.deepEqual(move,{x:670,y:885},'Two-finger translation pans with no zoom');
const zoom=scrollForTwoFingerMapGesture(700,900,100,60,from,from,2,2.5);
assert.ok(Math.abs((700+(from.x-100)/2) -
  (zoom.x+(from.x-100)/2.5))<1e-10);
assert.ok(Math.abs((900+(from.y-60)/2) -
  (zoom.y+(from.y-60)/2.5))<1e-10);
const together=scrollForTwoFingerMapGesture(700,900,100,60,from,to,2,2.5);
assert.ok(Math.abs((700+(from.x-100)/2) -
  (together.x+(to.x-100)/2.5))<1e-10);
assert.ok(Math.abs((900+(from.y-60)/2) -
  (together.y+(to.y-60)/2.5))<1e-10);
console.log('ENVIRONMENT STUDIO: obsolete green overlay absent; padded edge pan and 2-finger midpoint + zoom mathematics OK; collision input isolated.');
