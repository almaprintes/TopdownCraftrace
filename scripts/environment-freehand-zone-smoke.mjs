import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 polygonSignedArea,pointInsidePolygon,compileCollisionZone,resolveCollisionZone,
 validCollisionZone,simplifyFreehandZone
} from '../src/game/environment/FreehandCollisionZones.js';

const square={points:[{x:0,y:0},{x:100,y:0},{x:100,y:100},{x:0,y:100}],solid:true};
assert.ok(validCollisionZone(square));
assert.equal(polygonSignedArea(square.points),10000);
assert.equal(pointInsidePolygon(square.points,{x:50,y:50}),true);
assert.equal(pointInsidePolygon(square.points,{x:115,y:50}),false);
const solid=compileCollisionZone(square);
assert.deepEqual([solid.minX,solid.maxY],[0,100]);
assert.equal(resolveCollisionZone(solid,{x:500,y:500},14),null,'broad-phase far-away rejects');
assert.equal(resolveCollisionZone(solid,{x:-40,y:50},14),null,'free road outside');
const edge=resolveCollisionZone(solid,{x:-5,y:50},14);
assert.ok(edge&&edge.x<-14&&edge.y===50&&!edge.inside,'near perimeter pushes car OUT, not slows');
const deep=resolveCollisionZone(solid,{x:50,y:50},14);
assert.ok(deep?.inside&&!pointInsidePolygon(solid.points,deep),'spawning inside zone must escape polygon');
// Both winding directions have the same solid response.
const cw=compileCollisionZone({points:[...square.points].reverse(),solid:true});
assert.ok(cw&&cw.orientation===-1);
assert.ok(!pointInsidePolygon(cw.points,resolveCollisionZone(cw,{x:50,y:50},14)));
assert.ok(!validCollisionZone({points:[{x:0,y:0},{x:100,y:100},{x:0,y:100},{x:100,y:0}]}),
  'self-intersecting bow tie must be rejected');

// Simulate a single finger outline: 4 long sides with many touchmove samples.
// Simplification must close via renderer, preserve a useful area, and cap nodes.
const outline=[];
for(let x=0;x<=120;x+=2)outline.push({x,y:0});
for(let y=2;y<=120;y+=2)outline.push({x:120,y});
for(let x=118;x>=0;x-=2)outline.push({x,y:120});
for(let y=118;y>=0;y-=2)outline.push({x:0,y});
outline.push({x:0,y:0});
const freehand=simplifyFreehandZone(outline,{tolerance:4,maxPoints:180});
assert.ok(freehand&&validCollisionZone(freehand),'finger trace must create a valid polygon');
assert.ok(freehand.points.length<30,'do not preserve every finger sample');
assert.ok(Math.abs(polygonSignedArea(freehand.points))>11000,'smoothing cannot erase drawn area');
assert.ok(!simplifyFreehandZone([{x:0,y:0},{x:1,y:1}],{tolerance:4}));

const scene=readFileSync('src/game/scenes/EnvironmentBuilderFreehandCollisionScene.js','utf8');
for(const symbol of [
  '_startFreehandZones()','_editFreehandZones()','_cancelFreehandZone()',
  '_deleteFreehandZone()','_setupInput()','_drawCollisionZones()',
  "this._mode==='collision-zone-draw'",'this._collisionZones.push(zone)',
  'p.collisionZones=(this._collisionZones||[])',
  'this._collisionZones=(p?.collisionZones||[])',
  'this._zoneSelected.points=gesture.original'
])assert.ok(scene.includes(symbol),'missing freehand UI behavior '+symbol);
const runtime=readFileSync('src/game/scenes/raceEnvironmentRuntime.js','utf8');
for(const symbol of ['compileCollisionZone','resolveCollisionZone','solidZones',
  'resolveBodyAgainstSolidZones(scene,player)','resolveBodyAgainstSolidZones(scene,ai?.body)'])
  assert.ok(runtime.includes(symbol),'missing zone race physics '+symbol);
const game=readFileSync('src/game/game.js','utf8');
assert.ok(game.includes("import('./scenes/EnvironmentBuilderSafeWorkflowScene.js')"),
  'DEV lazy scene must load protected collision editor');
const pen=readFileSync('src/game/scenes/EnvironmentBuilderCollisionPenScene.js','utf8');
assert.ok(pen.includes('this._collisionZones=[];'),'clear-all must erase collision areas');
assert.ok(pen.includes('(this._collisionZones?.length||0)'),'zone-only project must be clearable');
console.log('Environment Studio freehand collision zones: touch simplification, winding, solid contact, deep escape, player/AI, save/undo and editor OK');
