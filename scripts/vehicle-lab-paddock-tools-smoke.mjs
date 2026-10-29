// DEV 1.3.63 · all Vehicle Lab subtools share one PADDOCK language.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const read=path=>readFileSync(path,'utf8');
const scene=read('src/game/scenes/GarageDetailScene.js');
const wrapper=read('src/game/scenes/GarageDetailSpeedConsistencyScene.js');
const dossier=read('src/game/ui/garageDetailPaddock.js');
const fichaCss=read('src/game/ui/garageDetailPaddock.css');
const shared=read('src/game/ui/vehicleLabPaddockShared.css');
const mastery=read('src/game/ui/AdminMasteryRoofCalibration.js');
const skins=read('src/game/ui/AdminSkinGeometryCalibration.js');
const lights=read('src/game/ui/AdminVehicleLightsCalibration.js');
const page=read('index.html');
assert.match(page,/name="tdr-dev-version" content="DEV 1\.\d+\.\d+"/);
for(const [name,code] of [['maestrías',mastery],['skins',skins],['luces',lights]]){
 assert.match(code,/import '\.\/vehicleLabPaddockShared\.css'/,name+' must share theme');
 for(const element of ['vl-paddock-tool','vl-tool-header','vl-tool-brand','vl-tool-logo','vl-tool-heading','vl-tool-filters','vl-tool-preview','vl-tool-controls']){
  assert.ok(code.includes(element),name+': missing '+element);
 }
 assert.ok(/data-(?:action="close"|close)/.test(code),name+' retains close callback');
 assert.ok(code.includes('data-car'),name+' retains car selection');
 assert.ok(code.includes('data-nudge'),name+' retains 1px edit actions');
 assert.ok(code.includes('data-export'),name+' retains JSON export');
}
for(const key of ['data-level','data-preview-visible','data-reset-view','data-copy','lobbyMasteryPlacement','bindMasteryHoldRepeat']){
 assert.ok(mastery.includes(key),'Mastery tool lost '+key);
}
for(const key of ['data-skin','data-view','data-reference','data-center','data-rotate','data-reset','bindMasteryHoldRepeat']){
 assert.ok(skins.includes(key),'Skin tool lost '+key);
}
for(const key of ['data-braking','data-group="front"','data-group="rear"','data-side="left"','data-side="right"','data-color','data-tail-color','data-intensity','data-halo','data-mirror','pointermove','bindMasteryHoldRepeat']){
 assert.ok(lights.includes(key),'Lights tool lost '+key);
}
assert.match(mastery,/tdr2:adminMasteryRoofDraft:1/);
assert.match(skins,/tdr2:adminSkinGeometryDraft:v1/);
assert.match(lights,/tdr2:adminVehicleLightsDraft:v1/);
assert.match(shared,/\.vl-paddock-tool\.vl-paddock-mastery/);
assert.match(shared,/\.vl-paddock-tool\.vl-paddock-skins/);
assert.match(shared,/\.vl-paddock-tool\.vl-paddock-lights/);
assert.match(shared,/\.vl-paddock-tool \.vl-tool-header/);
assert.match(shared,/env\(safe-area-inset-left/);
assert.match(shared,/\.vl-tool-controls\{/);
assert.match(shared,/overflow-y:auto!important/);
assert.match(shared,/@media\(max-height:540px\)/);
assert.match(shared,/touch-action:none!important/,'Gestures must not be trapped by the browser');
assert.match(scene,/mountGarageDetailPaddock\(this,\{/);
assert.match(scene,/const dsPremium = computeDesignStatsFromPhysics\(spec\)/);
assert.match(scene,/readTopSpeedPxps\(this\._carId\)/);
assert.match(scene,/if\(premium\)\{[\s\S]*?this\._garageDetailPaddock=premium;[\s\S]*?return;/);
assert.match(scene,/Legacy Phaser card is kept only as a fallback/);
assert.match(wrapper,/this\._garageDetailPaddock\?\.updateTopSpeed\?\.\(kmh\)/);
assert.match(dossier,/data-ficha-action="back"/);
assert.match(dossier,/data-ficha-action="tune"/);
assert.match(dossier,/data-ficha-action="test"/);
assert.match(dossier,/data-ficha-speed/);
assert.match(dossier,/data-ficha-image/);
assert.match(dossier,/node\?\.matches\?\.\('\.vl-ficha'\)/,'DOM root must work with Phaser DOMElement');
assert.match(dossier,/scene\.scale\.off\('resize',fit\)/,'Resize observer removed on exit');
assert.match(dossier,/scene\.events\.once\('shutdown',cleanup\)/);
assert.match(dossier,/scene\.events\.once\('destroy',cleanup\)/);
assert.match(dossier,/onTest\?\.\(\)/);
assert.match(dossier,/onBack\?\.\(\)/);
assert.match(scene,/localStorage\.setItem\('tdr2:carId',this\._carId\)/);
assert.match(scene,/this\.scene\.start\('race',\{carId:this\._carId\}\)/);
assert.match(fichaCss,/\.vl-ficha-body\{/);
assert.match(fichaCss,/grid-template-columns:minmax\(0,1\.08fr\) minmax\(0,1fr\)/);
assert.match(fichaCss,/\.vl-ficha-stats\{/);
assert.match(fichaCss,/env\(safe-area-inset-right/);
assert.match(fichaCss,/@media\(max-height:530px\)/);
for(const path of [
 'src/game/scenes/GarageDetailScene.js',
 'src/game/scenes/GarageDetailSpeedConsistencyScene.js',
 'src/game/ui/garageDetailPaddock.js',
 'src/game/ui/AdminMasteryRoofCalibration.js',
 'src/game/ui/AdminSkinGeometryCalibration.js',
 'src/game/ui/AdminVehicleLightsCalibration.js'
]){
 const result=spawnSync(process.execPath,['--check',path],{encoding:'utf8'});
 assert.equal(result.status,0,path+' syntax: '+result.stderr);
}
console.log('PASS Vehicle Lab 1.3.63: Maestrías, skins, luces + Ficha premium; callbacks, JSON drafts, 1px gestures, responsive layout, fallback and exit cleanup');
