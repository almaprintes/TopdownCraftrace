// Finish-line artwork is a decorative prop, independent from lap timing.
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import sharp from 'sharp';
import {scaleAtlanticoEnvironment,ATLANTICO_WORLD_SCALE} from '../src/game/tracks/atlanticoWorldScale.js';
const read=path=>readFileSync(path,'utf8');
const asset='public/assets/environment/finish-line-checkered-optimized.webp';
const rel='environment/finish-line-checkered-optimized.webp';
const id='finish_line_checkered';
const img=await sharp(asset).metadata();
assert.equal(img.format,'webp');
assert.deepEqual([img.width,img.height],[1024,177]);
assert.equal(img.hasAlpha,true);
assert.ok(statSync(asset).size<100*1024);
for(const file of [
  'src/game/scenes/EnvironmentBuilderScene.js',
  'src/game/scenes/EnvironmentBuilderScrollScene.js',
  'src/game/scenes/EnvironmentBuilderVegetationToolStateScene.js'
]){
  const src=read(file);
  assert.ok(src.includes(id)&&src.includes(rel),'Finish asset absent from '+file);
}
const base=read('src/game/scenes/EnvironmentBuilderScene.js');
assert.ok(base.includes("w:300,label:'LÍNEA DE META'"));
assert.ok(base.includes('const a=CATALOG.find(x=>x.id===d.asset)'),'Restoring projects uses same catalog');
assert.ok(base.includes('path:o._env.path'),'Export retains image path');
assert.ok(base.includes('displayWidth:+o.displayWidth.toFixed(2)'),'Export retains scale');
assert.ok(base.includes('rotation:+o.rotation.toFixed(5)'),'Export retains rotation');
const preload=read('src/game/scenes/EnvironmentBuilderVegetationToolStateScene.js');
assert.ok(preload.includes('this.load.image('),'Asset preloaded by active scene');
const dom=read('src/game/scenes/EnvironmentBuilderAssetPointerUpScene.js');
const library=read('src/game/scenes/EnvironmentBuilderAssetLibraryScene.js');
assert.ok(dom.includes('a.label||nice(a.id)'));
assert.ok(library.includes('a.label||a.id.replace'));
const runtime=read('src/game/scenes/raceEnvironmentRuntime.js');
assert.ok(runtime.includes("if(!String(item?.path||'').includes('environment/barriers/'))return"));
assert.ok(!rel.includes('environment/barriers/'),'Decal must not cause barrier collisions');
const decal={asset:id,path:rel,x:1000,y:500,rotation:.5,z:12,displayWidth:300};
const original={trackId:'circuito-atlantico',environment:[decal],collisionLines:[],collisionZones:[]};
const scaled=scaleAtlanticoEnvironment(original);
assert.equal(ATLANTICO_WORLD_SCALE,.7,'Approved Atlántico size');
assert.equal(scaled.environment[0].x,700);
assert.equal(scaled.environment[0].y,350);
assert.equal(scaled.environment[0].displayWidth,210);
assert.equal(scaled.environment[0].rotation,.5);
assert.equal(scaled.environment[0].path,rel);
assert.equal(original.environment[0].x,1000,'Must keep original source coordinates unchanged');
const editorSource=read('src/game/scenes/EnvironmentBuilderRealTrackCleanScene.js');
const editorExport=read('src/game/scenes/EnvironmentBuilderRealTrackScene.js');
assert.ok(editorSource.includes("['circuito-atlantico','siete-picos'].includes(this._trackId)"),'Only the authored Atlántico and 7 Picos photos receive world-scaled editor transforms');
assert.ok(editorSource.includes("(Number(t.w)||1)*tileWorldScale"),'Photo width needs the same transform as racing geometry');
assert.ok(editorSource.includes("(Number(t.x)||0)*tileWorldScale"),'Tile positions need the same transform as racing geometry');
assert.ok(editorExport.includes("p.coordinateSpace='race-world'"),'Editor must label its coordinate system');
assert.ok(runtime.includes("env.coordinateSpace==='race-world'?env:scaleAtlanticoEnvironment(env)"),'No double-scaling of editor decals; retain legacy source-photo support');
console.log('Finish line OK: 1024x177+alpha, optimized WebP, catalog/loader, save/export, decorative collision-free Atlántico 70%.');
