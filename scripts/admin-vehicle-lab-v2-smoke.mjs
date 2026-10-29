// DEV 1.3.63: Vehicle Lab must preserve native editor semantics while using
// ONE full-screen PADDOCK shell rather than duplicate Phaser header/controls.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
const read=p=>fs.readFileSync(p,'utf8');
const source=read('src/game/scenes/CarEditorScene.js');
const speed=read('src/game/scenes/CarEditorSpeedConsistencyScene.js');
const css=read('src/game/ui/adminVehicleLab.css');
const game=read('src/game/game.js');
const page=read('index.html');
assert.match(page,/name="tdr-dev-version" content="DEV 1\.\d+\.\d+"/);
assert.match(source,/import '\.\.\/ui\/adminVehicleLab\.css';/);
assert.match(game,/'car-editor':\{load:\(\)=>import\('\.\/scenes\/CarEditorSpeedConsistencyScene\.js'\)/);
assert.match(source,/this\._mountVehicleLabShell\(\)/);
assert.match(source,/panel\.replaceChildren\(ui, tip\)/,'Single real editor panel, no parallel shell');
assert.match(source,/this\._legacyVehicleTitle\?\.setVisible\(false\)/);
assert.match(source,/this\._legacyVehicleAdmin\?\.setVisible\(false\)/);
assert.match(source,/back\.setVisible\(false\)\.disableInteractive\(\)/);
assert.match(source,/c\.setVisible\(false\)/);
assert.match(source,/hit\.disableInteractive\(\)/);
for(const action of ['garage','paddock','export','save','test']){
 assert.ok(source.includes('data-vehicle-act="'+action+'"'),'Missing visible action '+action);
}
for(const id of ['mastery','skin-geometry','vehicle-lights','resetAll','factory','clear']){
 assert.ok(source.includes("'"+id+"'"),'Missing calibration/restore handler '+id);
}
for(const label of ['GUARDAR','FÍSICAS JSON','TEST'])assert.ok(source.includes("this._vehicleActions[label] = onClick;"),'Legacy actions must remain callable');
assert.match(source,/this\._writeDraft\(this\._carId, this\._override\)/,'Draft stored');
assert.match(source,/this\._writeOverride\(this\._carId, saved\)/,'Saved overrides retained');
assert.match(source,/returnTo: 'car-editor'/,'Test returns to editor');
assert.match(source,/schema_version: 1/,'Export JSON contract unchanged');
assert.match(source,/this\._openVehicleLightsCalibration\(\)/);
assert.match(source,/this\._openMasteryRoofCalibration\(\)/);
assert.match(source,/this\._openSkinGeometryCalibration\(\)/);
assert.match(source,/this\.scene\.start\(action === 'paddock' \? 'admin-hub' : 'GarageScene'/);
assert.match(source,/Hay ajustes sin guardar/,'Leaving draft prompts before discard');
assert.match(speed,/data-vehicle-telemetry/,'Actual attainable speed shown in DOM');
assert.match(css,/\.ve-workspace\{/);
assert.match(css,/grid-template-columns:minmax\(145px,21%\) minmax\(0,1fr\) minmax\(185px,24%\)/,'3-pane landscape');
assert.match(css,/\.ve-footer\{/);
assert.match(css,/overflow-y:auto/,'Scrollable inspector without page scroll');
assert.match(css,/env\(safe-area-inset-left/);
assert.match(css,/@media\(max-height:500px\)/);
assert.ok(!source.includes("this._vehicleActions?.[label]?.();\n    });\n  }\n  _refreshRow"),
 'Panel must be integrated as a proper method');
for(const path of ['src/game/scenes/CarEditorScene.js','src/game/scenes/CarEditorSpeedConsistencyScene.js']){
 const p=spawnSync(process.execPath,['--check',path],{encoding:'utf8'});
 assert.equal(p.status,0,'Syntax error in '+path+': '+p.stderr);
}
console.log('PASS Vehicle Lab 2.0: one PADDOCK shell, three clear columns, all car controls, draft/test/JSON contract, telemetry and iPhone layout.');
