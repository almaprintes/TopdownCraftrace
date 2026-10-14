import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import official from '../src/game/stats/masteryRoofCalibration.json' with {type:'json'};
import {
  normalizedMasteryCalibration,lobbyMasteryPlacement,raceMasteryPlacement,
  getMasteryRoofCalibration
} from '../src/game/stats/masteryBadgePlacement.js';
import {
  nudgeMasteryCalibration,mergeMasteryCalibration,CALIBRATION_EXPORT_FILENAME
} from '../src/game/stats/masteryRoofCalibrationTools.js';
const read=p=>readFileSync(p,'utf8');
assert.equal(official.schema_version,1);
assert.equal(official.units,'car_short_axis_ratio');
assert.deepEqual(Object.keys(official.cars).sort(),['helix_comet','helix_spark']);
assert.equal(official.cars.helix_comet.lobby.rotation,180);
assert.equal(official.cars.helix_spark.race.rotation,0);
assert.equal(CALIBRATION_EXPORT_FILENAME,'tdr-mastery-roof-calibration.json');
const zero=normalizedMasteryCalibration();
assert.deepEqual(zero,{x:0,y:0,size:0,rotation:0});
assert.equal(normalizedMasteryCalibration({rotation:450}).rotation,90);
assert.equal(normalizedMasteryCalibration({rotation:-90}).rotation,270);
assert.equal(normalizedMasteryCalibration({rotation:180}).rotation,180);
const first=nudgeMasteryCalibration(zero,'x',1,100);
assert.equal(first.x,.01,'1px horizontal nudge');
const second=nudgeMasteryCalibration(first,'y',-1,100);
assert.equal(second.y,-.01,'1px vertical nudge');
const scaled=nudgeMasteryCalibration(second,'size',1,100);
assert.equal(scaled.size,.01,'1px size nudge');
assert.equal(scaled.x,.01);
assert.equal(scaled.rotation,0);
assert.equal(nudgeMasteryCalibration(scaled,'x',1,0).x,.01,'zero paint size cannot corrupt calibration');
const lobby=lobbyMasteryPlacement({left:20,top:30,width:100,height:200},100,200,'helix_spark',{...scaled,rotation:180});
assert.equal(lobby.x,71);
assert.equal(lobby.y,30+200*.46-1);
assert.ok(Math.abs(lobby.size-(59+1))<.001);
assert.equal(lobby.rotation,180);
const race=raceMasteryPlacement(46,96,'helix_spark',{x:0.02,y:-0.02,size:0.01,rotation:90});
assert.equal(race.rotation,90);
assert.ok(race.x>0&&race.y<0&&race.radius>0);
assert.deepEqual(getMasteryRoofCalibration('no-such-car','lobby'),zero);
const exported=mergeMasteryCalibration(official,{helix_spark:{
  lobby:{x:.02,y:-.02,size:.01,rotation:90},
  race:{x:-.01,y:.04,size:-.02,rotation:270}
}},['helix_spark','helix_comet']);
assert.equal(exported.schema_version,1);
assert.equal(exported.units,'car_short_axis_ratio');
assert.equal(exported.cars.helix_spark.lobby.rotation,90);
assert.equal(exported.cars.helix_spark.race.rotation,270);
assert.equal(exported.cars.helix_spark.lobby.x,.02);
assert.equal(exported.cars.helix_spark.race.x,-.01);
assert.deepEqual(exported.cars.helix_comet,official.cars.helix_comet,'Export must preserve the committed Comet calibration');
const editor=read('src/game/ui/AdminMasteryRoofCalibration.js');
for(const marker of ['data-rotate','data-nudge="up"','data-nudge="shrink"',
  'data-view="lobby"','data-view="race"','data-export','data-reset-view',
  'data-car','initialCarId','badge.style.transform','saveDraft(draft)','mergeMasteryCalibration',
  'data-preview-visible','previewVisible[view]'])
  assert.ok(editor.includes(marker),'Mastery editor missing '+marker);
const car=read('src/game/scenes/CarEditorScene.js');
assert.match(car,/data-act="mastery"/);
assert.match(car,/showAdminMasteryRoofCalibration\(host/);
assert.match(car,/initialCarId:this\._carId/);
assert.match(car,/_masteryRoofEditor\?\.close\(\)/);
const lobbySrc=read('src/game/ui/LobbyPublishPolish.js');
const raceSrc=read('src/game/scenes/RaceMasteryRoofScene.js');
assert.match(lobbySrc,/lobbyMasteryPlacement\(cr,car\.naturalWidth,car\.naturalHeight,carId\)/);
assert.match(lobbySrc,/rotate\(\$\{place\.rotation\}deg\)/);
assert.match(raceSrc,/raceMasteryPlacement\(w,h,carId\)/);
assert.match(raceSrc,/g\.setRotation\(rotation\*Math\.PI\/180\)/);
assert.doesNotMatch(car,/carSpecs\.js\s*=|applyCarOverrides\(/,'Calibration never changes factory driving specs');
assert.ok(editor.includes("up:['y',-1],down:['y',1],left:['x',-1],right:['x',1]"),'Movement arrows must step by 1px');
assert.match(editor,/data-nudge="up" aria-label="Subir 1 píxel"/);
assert.match(editor,/class="mcal-controls"/);
assert.match(editor,/data-export>EXPORTAR MAESTRÍAS JSON/);
assert.match(editor,/bindMasteryHoldRepeat\(btn,/);
assert.match(editor,/hold\.dispose\(\)/);
assert.match(editor,/touch-action:none!important/);
assert.match(editor,/-webkit-touch-callout:none!important/);
console.log('Global mastery calibration: independent views, 1px nudge and hold, iPhone no-select, deterministic JSON export OK');
