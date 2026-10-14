import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
const read=path=>readFileSync(path,'utf8');
const game=read('src/game/game.js');
const garage=read('src/game/scenes/GarageScene.js');
const editor=read('src/game/scenes/CarEditorScene.js');
const wrapper=read('src/game/scenes/CarEditorSpeedConsistencyScene.js');
const calibrator=read('src/game/ui/AdminMasteryRoofCalibration.js');
const assets=new Set(readdirSync('public/assets/cars/lobby'));
const specs=read('src/game/cars/carSpecs.js');
// The lazy scene map MUST use the actual Phaser scene key. Otherwise
// an admin edit tap leaves only the garage blue background on screen.
assert.match(game, /'car-editor':\\{load:\\(\\)=>import\\('\\.\\/scenes\\/CarEditorSpeedConsistencyScene\\.js'\\),exportName:'CarEditorScene',admin:true\\}/);
assert.doesNotMatch(game, /(?<!['\\w])CarEditorScene:\\{load:/);
assert.match(garage, /this\\.scene\\.start\\('car-editor', \\{ carId: selected\\.id \\}\\)/);
assert.match(editor, /super\\('car-editor'\\)/);
assert.match(wrapper, /export class CarEditorScene extends CurrentCarEditorScene/);
assert.match(editor, /showAdminMasteryRoofCalibration\\(host,/);
assert.match(editor, /initialCarId:this\\._carId/);
assert.match(calibrator, /data-preview-visible/);
assert.match(calibrator, /previewVisible\\[view\\]/);
assert.match(calibrator, /LEGACY_CAR_IDS/);
const carIds=Array.from(specs.matchAll(/^\\s{2}([a-z][a-z0-9_]+):\\s*\\{/gm),m=>m[1])
  .filter(id=>!['stock','touring','power'].includes(id));
assert.ok(assets.has('helix_spark.webp'));
assert.ok(assets.has('helix_vortex.webp'));
assert.ok(carIds.length>10,'Expected factory fleet');
for(const id of carIds)assert.ok(assets.has(id+'.webp'),'Missing calibration car visual '+id);
console.log('Admin car-editor scene lazy route, real fleet images, and independent mastery preview visibility OK');
