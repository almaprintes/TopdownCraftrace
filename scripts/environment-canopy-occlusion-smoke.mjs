import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validCanopyZone,normalizedCanopyZones,scaleCanopyZones,photoCanopyContains}
  from '../src/game/environment/canopyOcclusionGeometry.js';
import {mountPhotoCanopyOcclusion,CANOPY_DEPTH}
  from '../src/game/tracks/photoCanopyOcclusion.js';
import {scaleKartingCanariasEnvironment} from '../src/game/tracks/kartingCanariasWorldScale.js';
import {physicalCircuitId} from '../src/game/tracks/trackReverseVariant.js';

const polygon=[
 {x:1410,y:1780},{x:1520,y:1790},{x:1540,y:1880},{x:1420,y:1890}
];
const good={kind:'photo-canopy',id:'left-straight-branches',opacity:.93,points:polygon};
assert.equal(validCanopyZone(good),true);
assert.equal(photoCanopyContains(good,{x:1480,y:1840}),true);
assert.equal(photoCanopyContains(good,{x:1800,y:1840}),false);
assert.equal(validCanopyZone({...good,points:[polygon[0],polygon[2],polygon[1],polygon[3]]}),false);
assert.equal(validCanopyZone({...good,opacity:0.1}),false);
assert.equal(normalizedCanopyZones([good],4096,6144).length,1);
assert.equal(normalizedCanopyZones([{...good,points:[{x:6000,y:1780},...polygon.slice(1)]}],4096,6144).length,0);
const scaled=scaleCanopyZones([good],2.5)[0];
assert.equal(scaled.points[0].x,3525);
assert.equal(scaled.points[0].y,4450);
const originalEnv={
 trackId:'karting-canarias',collisionLines:[],collisionZones:[],
 canopyZones:[{...good,points:polygon}]
};
const enlarged=scaleKartingCanariasEnvironment(originalEnv);
assert.equal(enlarged.canopyZones[0].points[0].x,3525);
assert.equal(originalEnv.canopyZones[0].points[0].x,1410);
assert.equal(enlarged.collisionLines.length,0);
assert.equal(enlarged.collisionZones.length,0);
const registrySource=readFileSync('src/game/tracks/environmentRegistry.js','utf8');
assert.match(registrySource,/physicalCircuitId\(id\)/);
assert.equal(physicalCircuitId('karting-canarias-4096-inverso'),'karting-canarias-4096');
const pilot=JSON.parse(readFileSync(
 'src/game/tracks/library/karting-canarias-4096/karting-canarias-4096.environment.json','utf8'));
// The owner completed EIGHT individual foreground crowns in Environment
// Studio, with detailed contours. Do not quietly restore any of the three
// coarse pilots or simplify the exact traced coordinates.
const expectedCanopyCounts=[76,56,47,33,16,118,38,21];
assert.equal(pilot.canopyZones?.length,8,'All 8 owner-drawn canopies must be installed');
assert.deepEqual(pilot.canopyZones.map(z=>z.points.length),expectedCanopyCounts);
assert.equal(normalizedCanopyZones(pilot.canopyZones,4096,6144).length,8);
assert.ok(pilot.canopyZones.every(z=>validCanopyZone(z)),'Every owner canopy must be geometrically valid');
assert.equal(new Set(pilot.canopyZones.map(z=>z.id)).size,8,'Distinct contour IDs');
assert.equal(pilot.version,7,'Keep owner production environment version 7');
assert.equal(pilot.collisionLines?.length,5,'No collision barriers are removed');
assert.equal(pilot.collisionZones?.length,1,'No solid collision zones are removed');
assert.deepEqual(pilot.collisionLines.map(line=>line.nodes.length),[28,2,8,3,4],
 'Canopy-only import must not change the existing physical barrier nodes');
assert.ok(pilot.canopyZones.every(z=>z.kind==='photo-canopy'),
 'Both circuit directions reuse the same physical environment polygons');

function photoMock(x,y,key,scale=1){
 return {scene:true,x,y,originX:0,originY:0,scaleX:scale,scaleY:scale,
  displayWidth:2048*scale,displayHeight:2048*scale,
  rotation:0,texture:{key},frame:{name:'__BASE'}};
}
function testRuntime(){
 const overlay=[];
 let maskDestroyed=false,graphicsDestroyed=false,registeredCleanup=null;
 const mask={destroy(){maskDestroyed=true}};
 const graphic={
  fillStyle(){return this},beginPath(){return this},moveTo(){return this},
  lineTo(){return this},closePath(){return this},fillPath(){return this},
  createGeometryMask(){return mask},destroy(){graphicsDestroyed=true}
 };
 const add={image(x,y,key,frame){
   const image={x,y,key,frame,depth:null,mask:null,
    setOrigin(ax,ay){this.origin=[ax,ay];return this},
    setScale(sx,sy){this.scale=[sx,sy];return this},
    setRotation(angle){this.rotation=angle;return this},
    setAlpha(alpha){this.alpha=alpha;return this},
    setDepth(depth){this.depth=depth;return this},
    setScrollFactor(){return this},
    setMask(m){this.mask=m;return this},
    destroy(){this.destroyed=true}
   };
   overlay.push(image);return image;
 }};
 const scene={track:{worldW:4096,worldH:6144},_tdrCanopyZones:[good],
  _trackBeautyTiles:[photoMock(0,0,'native:canarias:0:0',1),
    photoMock(2048,0,'native:canarias:2048:0',.75),
    photoMock(0,4096,'native:canarias:0:4096',1)],
  make:{graphics(){return graphic}},add,uiCam:{ignore(){}},
  events:{once(name,callback){assert.equal(name,'shutdown');registeredCleanup=callback}}
 };
 const layer=mountPhotoCanopyOcclusion(scene);
 assert.ok(layer);
 assert.equal(layer.overlay.length,1,'Only native tiles crossing canopy are repeated');
 assert.ok(overlay.every(o=>o.depth===CANOPY_DEPTH&&o.mask===mask&&o.alpha===.93));
 assert.deepEqual(overlay[0].scale,[1,1],'Original tile source keeps exact transform');
 assert.equal(CANOPY_DEPTH>30&&CANOPY_DEPTH<1000,true,'Above race cars and below HUD');
 assert.ok(registeredCleanup);registeredCleanup();
 assert.equal(scene._tdrCanopyOcclusion,null);
 assert.ok(overlay.every(o=>o.destroyed));
 assert.equal(maskDestroyed,true);
 assert.equal(graphicsDestroyed,true);
 scene._tdrCanopyZones=[];
 assert.equal(mountPhotoCanopyOcclusion(scene),null,'No masks means no extra photo draws');
}
testRuntime();
const runtime=readFileSync('src/game/scenes/raceEnvironmentRuntime.js','utf8');
const loader=readFileSync('src/game/tracks/imageNativeRaceLoader.js','utf8');
const editor=readFileSync('src/game/scenes/EnvironmentBuilderCanopyOcclusionScene.js','utf8');
const game=readFileSync('src/game/game.js','utf8');
const scale=readFileSync('src/game/tracks/kartingCanariasWorldScale.js','utf8');
assert.match(runtime,/scene\._tdrCanopyZones=normalizedCanopyZones\(env\.canopyZones/);
assert.match(loader,/mountPhotoCanopyOcclusion\(scene\)/);
assert.match(loader,/scene\._trackBeautyTiles=sprites;[\s\S]{0,300}mountPhotoCanopyOcclusion/);
assert.match(game,/EnvironmentBuilderCanopyOcclusionScene\.js/);
assert.match(editor,/p\.canopyZones=|project\.canopyZones=|project\.canopyZones=/);
assert.match(editor,/_applyProject\(p\)/);
assert.match(editor,/_drawCanopies\(\)/);
assert.match(editor,/data-canopy="finish"/);
assert.match(editor,/CARGAR 8 COPAS CANARIAS/);
assert.match(editor,/candidates\.length!==8/);
assert.match(editor,/this\._exitGuard\?\.backup\?\.\('canopy-finished'\)/);
assert.match(scale,/canopyZones:/);
assert.ok(!/addSegmentCollider\([^\n]*canopy/.test(runtime));
assert.match(readFileSync('index.html','utf8'),/<meta name="tdr-dev-version" content="DEV 1\.3\.7"/);
console.log('PASS: Environment Studio photo-canopy polygons persisted; no collisions; same native tiles masked above cars; iOS compact scale; cleanup; Canarias / inverso / x2.5');
