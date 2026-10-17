import assert from 'node:assert/strict';
import {carGeometry,measureRoadSections} from './audit-track-car-scale.mjs';
const make=(y)=>[{x:0,y,handleIn:{x:0,y},handleOut:{x:35,y}},
  {x:100,y,handleIn:{x:65,y},handleOut:{x:135,y}}];
const shape={version:1,closed:false,leftEdge:make(-40),rightEdge:make(40)};
const road=measureRoadSections({trackWidth:80,closed:false,centerline:
  [{x:0,y:0},{x:50,y:0},{x:100,y:0}],trackShape:shape},{sampleCount:12});
assert.equal(road.valid,12);
assert.ok(Math.abs(road.median-80)<1e-6,'Bezier width should be 80px');
const real=carGeometry({visualScale:1.1,collisionScale:1.03},.35,{width:200,height:100});
assert.equal(real.collisionRadiusPx,5);
assert.equal(real.targetBoxWidthPx,49.9);
assert.equal(real.targetBoxHeightPx,24.95);
assert.equal(real.spriteShortSidePx,24.95);
assert.equal(carGeometry({visualScale:1},1,{width:100,height:50}).collisionRadiusPx,14);
const invalid=measureRoadSections({centerline:[],trackWidth:80,trackShape:shape});
assert.equal(invalid.valid,0);
console.info('PASS: source Bézier cross-sections, sprite fit, circuit scale and collision radius');
