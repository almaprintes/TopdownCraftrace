import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
const read=path=>readFileSync(path,'utf8');
const game=read('src/game/game.js');
const garage=read('src/game/scenes/GarageScene.js');
const editor=read('src/game/scenes/CarEditorScene.js');
const wrapper=read('src/game/scenes/CarEditorSpeedConsistencyScene.js');
const calibrator=read('src/game/ui/AdminMasteryRoofCalibration.js');
const assets=new Set(readdirSync('public/assets/cars/lobby'));
// The lazy scene map MUST use the exact Phaser key used in GarageScene.
// The old CarEditorScene map key left the player on a blue blank screen.
assert.ok(game.includes("'car-editor':{load:()=>import('./scenes/CarEditorSpeedConsistencyScene.js'),exportName:'CarEditorScene',admin:true}"));
assert.ok(!game.includes("CarEditorScene:{load:"),'Obsolete lazy scene alias is forbidden');
assert.ok(garage.includes("this.scene.start('car-editor', { carId: selected.id })"));
assert.ok(editor.includes("super('car-editor')"));
assert.ok(wrapper.includes('export class CarEditorScene extends CurrentCarEditorScene'));
assert.ok(editor.includes('showAdminMasteryRoofCalibration(host,'));
assert.ok(editor.includes('initialCarId:this._carId'));
assert.ok(calibrator.includes('data-preview-visible'));
assert.ok(calibrator.includes('previewVisible=!!event.target.checked'),'Single preview visibility toggle remains operational');
assert.ok(!calibrator.includes('data-view="race"'),'No separate race calibration tab');
assert.ok(calibrator.includes('LEGACY_CAR_IDS'));
assert.ok(editor.includes('panel tdr-car-editor'));
assert.ok(editor.includes('FÍSICAS JSON'));
assert.ok(calibrator.includes('mcal-controlpanel')||calibrator.includes('mcal-controls'));
assert.ok(assets.size>=15,'Expected actual fleet visuals');
for(const id of ['helix_spark','helix_vortex','veloce_juanicar_c220'])
  assert.ok(assets.has(id+'.webp'),'Missing calibration visual for '+id);
console.log('Admin car-editor scene route and mastery calibration preview controls OK');
