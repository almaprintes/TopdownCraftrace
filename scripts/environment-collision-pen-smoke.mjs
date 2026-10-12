import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {penNode,validCollisionLine,cubicCollisionPoint,insertCollisionNode,sampleCollisionLine,hitCollisionCurve} from '../src/game/environment/CollisionPenGeometry.js';

const A=penNode(0,0),B=penNode(100,0);
let line={nodes:[A,B],type:'collision',halfThickness:9};
assert.ok(validCollisionLine(line));
assert.equal(sampleCollisionLine(line).at(-1).x,100);
assert.ok(sampleCollisionLine(line).length>=5);
assert.ok(hitCollisionCurve(line,{x:50,y:3},10)?.segment===0);
assert.equal(hitCollisionCurve(line,{x:50,y:80},10),null);

// Photoshop pen gesture: drag at anchor yields symmetrical handles.
A.out={x:20,y:-55};A.in={x:-20,y:55};
B.in={x:80,y:-55};B.out={x:120,y:55};
const before=Array.from({length:81},(_,i)=>cubicCollisionPoint(line.nodes,0,i/80));
const inserted=insertCollisionNode(line.nodes,0,.4);
assert.equal(line.nodes.length,3);
assert.equal(inserted,line.nodes[1]);
// de Casteljau split exactly preserves both pieces, even at sharp bends.
for(let k=0;k<=80;k++){
  const t=k/80,s=t<=.4?0:1,u=t<=.4?t/.4:(t-.4)/.6;
  const result=cubicCollisionPoint(line.nodes,s,u);
  assert.ok(Math.hypot(result.x-before[k].x,result.y-before[k].y)<1e-8,'Curve changed by node insertion at '+t);
}
assert.ok(sampleCollisionLine(line).length>=6,'Curved wall must be segmented for physics');
const serialized=JSON.parse(JSON.stringify(line));
assert.ok(validCollisionLine(serialized));
assert.equal(serialized.nodes.length,3);
assert.ok(!validCollisionLine({nodes:[penNode(10,10)]}));
assert.ok(!validCollisionLine({nodes:[A,{...B,out:{x:NaN,y:0}}]}));

const ui=readFileSync('src/game/scenes/EnvironmentBuilderCollisionPenScene.js','utf8');
for(const signature of ['_mountCollisionPenUi()','_setupInput()','_finishCollisionPen()','_removeLastCollisionNode()','_deleteCollisionLine()','_drawCollisionPen()',
  'insertCollisionNode(hit.line.nodes','p.collisionLines=(this._collisionLines||[])','this._collisionLines=(p?.collisionLines||[])','_clearCurrentDecoration()']){
  assert.ok(ui.includes(signature),'Missing UI behavior '+signature);
}
const runtime=readFileSync('src/game/scenes/raceEnvironmentRuntime.js','utf8');
assert.ok(runtime.includes('for(const line of env.collisionLines||[])'));
assert.ok(runtime.includes('sampleCollisionLine(line,18)'));
assert.ok(runtime.includes("half,'collision'"));
assert.ok(runtime.includes('if(px<Math.min(c.ax,c.bx)-reach'));
const game=readFileSync('src/game/game.js','utf8');
assert.ok(game.includes("import('./scenes/EnvironmentBuilderCollisionPenScene.js')"));
console.log('Environment Studio collision pen: Bézier creation, exact split, hit testing, saves, invisible race collision and mobile broad phase OK');
