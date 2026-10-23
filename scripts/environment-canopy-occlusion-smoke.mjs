import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {validCanopyZone,normalizedCanopyZones,scaleCanopyZones,photoCanopyContains}
  from '../src/game/environment/canopyOcclusionGeometry.js';
import {validCollisionZone,compileCollisionZone,resolveCollisionZone}
  from '../src/game/environment/FreehandCollisionZones.js';
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
const tenerife=JSON.parse(readFileSync(
 'src/game/tracks/library/karting-tenerife/karting-tenerife.environment.json','utf8'));
assert.equal(tenerife.trackId,'karting-tenerife');
assert.equal(tenerife.version,7);
assert.equal(physicalCircuitId('karting-tenerife-horario'),'karting-tenerife',
 "Tenerife uses the -horario ID for the clockwise normal race, not -inverso");
assert.equal(tenerife.canopyZones?.length,3,'All 3 owner-drawn Tenerife Copas are installed');
assert.deepEqual(tenerife.canopyZones.map(z=>z.points.length),[78,94,36]);
assert.equal(createHash('sha256').update(JSON.stringify(tenerife.canopyZones)).digest('hex'),
 'c885e69bbb936a5601471d202b524e93739032548622aeb64eb8b56ed1e12aa3',
 'The 208 Tenerife vertices, IDs and opacity must stay byte-for-byte equivalent to the owner export');
assert.equal(new Set(tenerife.canopyZones.map(z=>z.id)).size,3,'Each Tenerife Copa is distinct');
assert.equal(normalizedCanopyZones(tenerife.canopyZones,2813,2602).length,3);
assert.ok(tenerife.canopyZones.every(z=>validCanopyZone(z)&&z.opacity===.93));
assert.equal(tenerife.collisionLines?.length,5);
assert.deepEqual(tenerife.collisionLines.map(z=>z.nodes.length),[2,2,4,5,3],
 'Original Tenerife pen barriers remain unchanged');
assert.equal(tenerife.collisionZones?.length,17,'All original Tenerife solid zones remain');
const santa=JSON.parse(readFileSync(
 'src/game/tracks/library/santa-cruz/source/santa-cruz-photo.environment.json','utf8'));
const santaPublished=JSON.parse(readFileSync(
 'src/game/tracks/library/santa-cruz/santa-cruz.environment.json','utf8'));
const santaCounts=[26,49,48,45,20,23,18,25,19,10,15,10,9];
assert.equal(santa.trackId,'santa-cruz');
assert.equal(santa.version,7);
assert.equal(physicalCircuitId('santa-cruz-inverso'),'santa-cruz');
assert.deepEqual(santa.canopyZones.map(z=>z.points.length),santaCounts,
 'Every owner-created Santa Cruz Copa must survive the photo source installer');
assert.deepEqual(santaPublished.canopyZones,santa.canopyZones,
 'Source AND installed environment must contain the exact same Copas');
assert.equal(normalizedCanopyZones(santa.canopyZones,3072,4608).length,13);
assert.equal(createHash('sha256').update(JSON.stringify(santa.canopyZones)).digest('hex'),
 '861d24c68c83efbd29761ea099a86cc3d4ae8198db7f662e3fc88aeba2f1f448',
 'Preserve all 317 Santa Cruz contour vertices, including two new Copas');
assert.equal(santa.collisionLines.length,4);
assert.deepEqual(santa.collisionLines.map(z=>z.nodes.length),[24,8,11,12]);
assert.equal(santa.collisionZones.length,3,'Three newly authored solid polygons must be collidable');
assert.deepEqual(santa.collisionZones.map(z=>z.points.length),[21,17,26]);
assert.deepEqual(santaPublished.collisionZones,santa.collisionZones,
 'CI source installer must preserve all three solid polygons');
assert.equal(createHash('sha256').update(JSON.stringify(santa.collisionZones)).digest('hex'),
 'b2b9185e3973a7019f702b5a2e83db5c501acc74bf4c092e9ca11185d8ab9a78',
 'Keep every owner-authored Santa Cruz solid-zone vertex unchanged');
assert.equal(createHash('sha256').update(JSON.stringify(santa.collisionLines)).digest('hex'),
 '16215b6783ec5fa49be0309018200cad67f1701df775fa6b3ecd9d7c607cebd0',
 'Owner pen barriers must remain identical to the previous published circuit');
for(const zone of santa.collisionZones){
 assert.equal(zone.solid,true);
 assert.ok(validCollisionZone(zone),'Each authored Santa Cruz solid is geometrically valid');
 assert.ok(zone.points.every(p=>p.x>=0&&p.y>=0&&p.x<=3072&&p.y<=4608),
   'All solids are in the native Santa Cruz photo coordinate space');
 const compiled=compileCollisionZone(zone);
 assert.ok(compiled&&compiled.maxX>compiled.minX&&compiled.maxY>compiled.minY,
   'All solid zones are accepted by the actual collision runtime');
 assert.equal(resolveCollisionZone(compiled,{x:-999,y:-999},8),null,
   'Distant cars are not blocked by an unrelated solid zone');
}
assert.ok(readFileSync('scripts/install-santa-cruz-source.mjs','utf8').includes(
 'fs.writeFileSync(environmentTarget,JSON.stringify(environment,null,2)'),
 'Installer always reads the Copas-equipped authoritative source project');

const americas=JSON.parse(readFileSync(
 'src/game/tracks/library/karting-americas/karting-americas.environment.json','utf8'));
assert.equal(americas.trackId,'karting-americas');
assert.equal(americas.version,7);
assert.equal(physicalCircuitId('karting-americas-inverso'),'karting-americas');
assert.deepEqual(americas.canopyZones.map(z=>z.points.length),[85],
 'Owner-drawn 85-point Americas Copa must remain complete');
assert.equal(normalizedCanopyZones(americas.canopyZones,2862,3435).length,1);
assert.equal(createHash('sha256').update(JSON.stringify(americas.canopyZones)).digest('hex'),
 '0b2276d161b1a990e851de64a7b413c5bf147ede029c6c93bc7d2c92a8543fab');
assert.equal(americas.collisionLines.length,8);
assert.deepEqual(americas.collisionLines.map(z=>z.nodes.length),[16,3,4,4,4,5,9,27],
 'Unchanged eight Americas barriers');
assert.equal(americas.collisionZones.length,0);
for(const env of [santa,americas]){
 assert.ok(env.canopyZones.every(z=>validCanopyZone(z)&&z.kind==='photo-canopy'&&z.opacity===.93));
 assert.equal(new Set(env.canopyZones.map(z=>z.id)).size,env.canopyZones.length);
}



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
assert.match(editor,/CARGAR COPAS DEL CIRCUITO/);
assert.match(editor,/createTrackEnvironment\(trackId\)/);
assert.match(editor,/data-canopy="import-copas"/);
assert.match(editor,/if\(!candidates\.length\)/);
assert.match(editor,/this\._exitGuard\?\.backup\?\.\('canopy-finished'\)/);
assert.match(scale,/canopyZones:/);
assert.ok(!/addSegmentCollider\([^\n]*canopy/.test(runtime));
// The DEV marker must exist but this geometry test must not pin one release.
assert.match(readFileSync('index.html','utf8'),/<meta name="tdr-dev-version" content="DEV [0-9]+[.][0-9]+[.][0-9]+"/);
console.log("PASS: Santa Cruz source: 13 Copas (317 vertices) and 3 valid solid collision zones (64 vertices), preserved 4 pen lines; Americas, Tenerife and Canarias stable");
