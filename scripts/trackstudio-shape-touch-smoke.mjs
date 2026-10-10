import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createTrackShape } from '../src/game/studio/trackShapeGeometry.js';
import { pickShapeTarget,isSelectedShapeControl,offsetShapeDragTarget } from '../src/game/studio/shapeTouchInteraction.js';

const raw=[
  {x:100,y:100,handleIn:{x:-100,y:100},handleOut:{x:280,y:100}},
  {x:700,y:100,handleIn:{x:520,y:100},handleOut:{x:700,y:280}},
  {x:700,y:700,handleIn:{x:700,y:520},handleOut:{x:520,y:700}},
  {x:100,y:700,handleIn:{x:280,y:700},handleOut:{x:100,y:520}}
];
const original=JSON.stringify(raw);
const shape=createTrackShape(raw,200,true);
const first=shape.leftEdge[0];
let hit=pickShapeTarget(shape,null,{x:first.x+95,y:first.y},.2);
assert.equal(hit?.side,'leftEdge');
assert.equal(hit?.index,0,'Touch target must scale with zoom, not be capped in world units');
assert.equal(hit?.kind,'node');
hit=pickShapeTarget(shape,null,{x:400,y:0},.4);
assert.equal(hit?.side,'leftEdge','Touching middle of boundary should select an edge');
assert.equal(hit?.kind,'edge');
hit=pickShapeTarget(shape,null,{x:400,y:100},.4);
assert.equal(hit?.kind,'surface','Touching inside asphalt should reveal border controls');
assert.ok(['leftEdge','rightEdge'].includes(hit.side));
assert.equal(pickShapeTarget(shape,null,{x:3000,y:3000},.4),null,'Empty terrain remains a pan target');
const previous={side:'leftEdge',index:0,part:'anchor'};
hit=pickShapeTarget(shape,previous,{x:first.x,y:first.y},.4);
assert.equal(hit.part,'anchor','Near handles must not steal a tap on selected anchor');
assert.equal(isSelectedShapeControl(hit,previous),true);
const unselected=pickShapeTarget(shape,null,{x:400,y:0},.4);
assert.equal(isSelectedShapeControl(unselected,previous),false,'Touching path must only select');
const target=offsetShapeDragTarget({x:160,y:170},{x:15,y:-30});
assert.deepEqual(target,{x:175,y:140},'Finger offset must be conserved when dragging');
assert.equal(JSON.stringify(raw),original,'Pure picker cannot mutate centerline');

const scene=readFileSync('src/game/scenes/TrackStudioScene.js','utf8'),
      editor=readFileSync('src/game/studio/installTrackShapeEditor.js','utf8');
for(const tag of ['Mobile shape mode: first tap selects','const canDrag = sameNode','this._shapeSelectionOnly = !canDrag','this._shapeDragOffset = {','A first-touch selection never morphs','if (this._shapeSelectionOnly)']) {
 assert.ok(scene.includes(tag),'Missing safe mobile gesture: '+tag);
}
assert.ok(editor.includes('s._nodeGfx?.clear();s._guideGfx?.clear();'),'Centerline nodes must not overlay active boundaries');
assert.ok(editor.includes('if(side!==s._shapeSelected.side)continue'),'Only selected border nodes should be shown');
assert.ok(editor.includes('pickShapeTarget('));
console.log('TrackStudio touch UX: zoom-scaled selection, asphalt and border tap, second-gesture movement, clean handles, no mutations: OK');
