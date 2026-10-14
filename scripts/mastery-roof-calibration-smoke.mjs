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
assert.equal(CALIBRATION_EXPORT_FILENAME,'tdr-mastery-roof-calibration.json');
const zero=normalizedMasteryCalibration();
assert.deepEqual(zero,{x:0,y:0,size:0,rotation:0});
assert.equal(normalizedMasteryCalibration({rotation:450}).rotation,90);
assert.equal(normalizedMasteryCalibration({rotation:-90}).rotation,270);
assert.equal(normalizedMasteryCalibration({rotation:180}).rotation,180);
const first=nudgeMasteryCalibration(zero,'x',2,100);
assert.equal(first.x,.02,'2px horizontal nudge');
const second=nudgeMasteryCalibration(first,'y',-2,100);
assert.equal(second.y,-.02,'2px vertical nudge');
const scaled=nudgeMasteryCalibration(second,'size',1,100);
assert.equal(scaled.size,.01,'1px size nudge');
assert.equal(scaled.x,.02);
assert.equal(scaled.rotation,0);
assert.equal(nudgeMasteryCalibration(scaled,'x',2,0).x,.02,'zero paint size cannot corrupt calibration');
const lobby=lobbyMasteryPlacement({left:20,top:30,width:100,height:200},100,200,'helix_spark',{...scaled,rotation:180});
assert.equal(lobby.x,72);
assert.equal(lobby.y,30+200*.46-2);
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
assert.equal(exported.cars.helix_comet,undefined);
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
console.log('Global mastery calibration: two independent views per car; ±2 px, ±1 px, 90° turns, durable draft and deterministic JSON export OK');
