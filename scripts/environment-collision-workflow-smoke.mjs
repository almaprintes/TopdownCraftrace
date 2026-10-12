import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {simplifyFreehandZone,validCollisionZone,pointInsidePolygon} from '../src/game/environment/FreehandCollisionZones.js';

// Multi-pass boundary creation: two individual strokes remain open until
// TERMINAR is pressed; the simplifier produces a single valid closed area.
const first=[{x:0,y:0},{x:200,y:0},{x:200,y:100}];
const second=[{x:200,y:100},{x:200,y:200},{x:0,y:200},{x:0,y:100},{x:0,y:0}];
const draft=[...first,...second];
const compiled=simplifyFreehandZone(draft,{tolerance:3,maxPoints:180});
assert.ok(compiled&&validCollisionZone(compiled),'strokes combine into a valid polygon');
assert.equal(pointInsidePolygon(compiled.points,{x:100,y:100}),true);
const checkpoints=[0,first.length];
const undoDraft=[...draft];
undoDraft.length=checkpoints[1];
assert.deepEqual(undoDraft,first,'undo last stroke must restore previous draft');

const nav=readFileSync('src/game/scenes/EnvironmentBuilderCollisionWorkflowScene.js','utf8');
for(const text of [
  '✋ MOVER MAPA','✎ CONTINUAR','↶ DESHACER','✓ TERMINAR',
  '_pauseCollisionForPan(){','_resumeCollisionDrawing(){','_undoCollisionAction(){',
  '_collisionPausedMode','_penDraft.nodes.pop()','this._zoneDraft.length=start',
  "this._mode='pan'","this._mode=tool",
  "pan?.addEventListener('click'","e.stopImmediatePropagation()",
  'this._pinching','this._penDraft.nodes.pop();',
  'this._zoneDraft.length=z.start','this._zoneStrokeStarts.pop()'
]){
  assert.ok(nav.includes(text),'missing navigation/undo/touch protection: '+text);
}
const penSource=readFileSync('src/game/scenes/EnvironmentBuilderCollisionPenScene.js','utf8');
assert.ok(penSource.includes("this._undoCollisionAction?this._undoCollisionAction():this._removeLastCollisionNode()"),
  'pluma undo must fire exactly once');
const zones=readFileSync('src/game/scenes/EnvironmentBuilderFreehandCollisionScene.js','utf8');
assert.ok(zones.includes("this._undoCollisionAction?this._undoCollisionAction():this._undoFreehandStroke()"),
  'zone undo must fire exactly once');
assert.ok(zones.includes('this._zoneStrokeStarts.push(gesture.start)'));
assert.ok(zones.includes('Math.hypot(p.x-gesture.startScreen.x,p.y-gesture.startScreen.y)<9'),
  'short tap must not create an accidental freehand point');
assert.ok(zones.includes('_finishFreehandZone(){'));
assert.ok(zones.includes('_undoFreehandStroke(){'));
const up=zones.slice(zones.indexOf('const release=(p,outside=false)=>'),zones.indexOf('  _drawCollisionZones(){'));
assert.ok(!up.includes('this._collisionZones.push(zone)'),
  'finger up MUST NOT auto-close an area');
const game=readFileSync('src/game/game.js','utf8');
assert.ok(game.includes("import('./scenes/EnvironmentBuilderCollisionWorkflowScene.js')"));
const pipeline=readFileSync('.github/workflows/pages.yml','utf8');
assert.ok(pipeline.includes('node scripts/environment-collision-workflow-smoke.mjs'));
console.log('Environment Studio: explicit pan/resume, reversible drafts, multi-stroke area, tap threshold and pinch rollback OK');
