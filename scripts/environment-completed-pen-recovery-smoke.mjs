import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validCollisionLine,sampleCollisionLine,penNode} from '../src/game/environment/CollisionPenGeometry.js';

const source=readFileSync('src/game/scenes/EnvironmentBuilderCollisionWorkflowScene.js','utf8');
const penSource=readFileSync('src/game/scenes/EnvironmentBuilderCollisionPenScene.js','utf8');
const freeSource=readFileSync('src/game/scenes/EnvironmentBuilderFreehandCollisionScene.js','utf8');
const env=JSON.parse(readFileSync('src/game/tracks/library/karting-tenerife/karting-tenerife.environment.json','utf8'));
const required=[
  '_penCheckpointKey(){',
  '_checkpointCompletedPen(){',
  'const deletedIds=new Set(existing?.deletedIds||[])',
  '_finishCollisionPen(){',
  'super._finishCollisionPen?.()',
  'this._checkpointCompletedPen();',
  'super._save?.();',
  '_restoreMissingCollisionLines(){',
  'recovery.project?.collisionLines',
  'saved.collisionLines',
  'this._undoStack||[]',
  'this._collisionLines=[...(this._collisionLines||[]),',
  'RECUPERAR PLUMA GUARDADA',
  '_deleteCollisionLine(){',
  '_clearCurrentDecoration(){',
  'deletedIds,lines:[]',
  'PLUMA SIN TERMINAR',
  'FALTAN',
  'if((exported?.collisionLines||[]).length!==current)'
];
for(const v of required)assert.ok(source.includes(v),'Missing finished pen recovery safeguard: '+v);
assert.ok(penSource.includes('this._collisionLines.push(clone(line));'),
  'Finishing the Bézier pen must commit the line to the project');
assert.ok(freeSource.includes('this._penDraft=null;this._penGesture=null;this._collisionSelected=null;') &&
  !freeSource.slice(freeSource.indexOf('_startFreehandZones(){'),freeSource.indexOf('_finishFreehandZone(){')).includes('this._collisionLines=[]'),
  'Switching from finished pen to freehand must retain committed lines');
assert.ok(env.collisionZones.length===7&&env.collisionLines.length===0,
  'Do not fabricate a line that was absent from the original export');
const a=penNode(10,20),b=penNode(160,80);
const line={id:'pen-saved',nodes:[a,b]};
assert.ok(validCollisionLine(line)&&sampleCollisionLine(line).length>2);
assert.ok(validCollisionLine(JSON.parse(JSON.stringify(line))),
  'Checkpoint data must be JSON round-trippable');
console.log('Pen backup: committed segments survive tool switching; explicit restore checks checkpoint, local save, recovery and undo; deletions stay deleted');
