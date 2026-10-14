import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CAR_SPECS} from '../src/game/cars/carSpecs.js';
import official from '../src/game/stats/masteryRoofCalibration.json' with {type:'json'};
import {
  normalizedMasteryCalibration,canonicalMasteryCalibration,carLocalMasteryPlacement,
  lobbyMasteryPlacement,raceMasteryPlacement,getMasteryRoofCalibration
} from '../src/game/stats/masteryBadgePlacement.js';
import {nudgeMasteryCalibration,mergeMasteryCalibration,CALIBRATION_EXPORT_FILENAME}
  from '../src/game/stats/masteryRoofCalibrationTools.js';

const read=p=>readFileSync(p,'utf8');
const near=(a,b,message)=>assert.ok(Math.abs(a-b)<1e-7,message+': '+a+' vs '+b);
assert.equal(official.schema_version,2);
assert.equal(official.units,'car_short_axis_ratio');
assert.equal(CALIBRATION_EXPORT_FILENAME,'tdr-mastery-roof-calibration.json');
const allOfficialCarIds=Object.keys(CAR_SPECS).filter(id=>!['stock','touring','power'].includes(id)).sort();
assert.equal(allOfficialCarIds.length,17,'17 actual player cars');
assert.deepEqual(Object.keys(official.cars).sort(),allOfficialCarIds,'Complete 17-car mastery config');
for(const [id,row] of Object.entries(official.cars)){
  assert.deepEqual(Object.keys(row).sort(),['rotation','size','x','y'],'Single calibration row '+id);
  assert.deepEqual(normalizedMasteryCalibration(row),row,'Valid canonical coordinates '+id);
}
assert.equal(official.cars.helix_vortex.rotation,180);
assert.equal(official.cars.helix_pulse.rotation,180);
assert.equal(official.cars.veloce_juanicar_c220.rotation,0);
assert.deepEqual(official.cars.helix_comet,{x:-0.02745896,y:-0.35010174,size:0,rotation:180});
assert.deepEqual(official.cars.helix_spark,{x:-0.04430288,y:0.04555298,size:-0.0967206,rotation:0});
const zero=normalizedMasteryCalibration();
assert.deepEqual(zero,{x:0,y:0,size:0,rotation:0});
assert.equal(normalizedMasteryCalibration({rotation:450}).rotation,90);
assert.equal(normalizedMasteryCalibration({rotation:-90}).rotation,270);
const first=nudgeMasteryCalibration(zero,'x',1,100);
const second=nudgeMasteryCalibration(first,'y',-1,100);
const scaled=nudgeMasteryCalibration(second,'size',1,100);
assert.equal(first.x,.01);
assert.equal(second.y,-.01);
assert.equal(scaled.size,.01);
assert.equal(scaled.rotation,0);
assert.equal(nudgeMasteryCalibration(scaled,'x',1,0).x,.01,'Invalid short axis must be ignored');
const legacy={
 lobby:{x:-0.02745896,y:-0.28145434,size:0,rotation:180},
 race:{x:-0.0343237,y:-0.30204856,size:-0.04805318,rotation:180}
};
assert.deepEqual(canonicalMasteryCalibration(legacy),{x:-0.02745896,y:-0.28145434,size:0,rotation:180},'Legacy v1 lobby calibration still migrates as authored');
assert.deepEqual(canonicalMasteryCalibration({race:legacy.race}),legacy.race);
assert.deepEqual(getMasteryRoofCalibration('helix_comet','race'),getMasteryRoofCalibration('helix_comet','lobby'));
assert.deepEqual(getMasteryRoofCalibration('unknown'),zero);
for(const id of ['helix_comet','helix_spark','unknown']){
 for(const [width,height] of [[46,96],[96,46],[120,230],[230,120],[160,90]]){
  const paint={left:15,top:25,width,height};
  const css=lobbyMasteryPlacement(paint,width,height,id);
  const phaser=raceMasteryPlacement(width,height,id);
  const local=carLocalMasteryPlacement(width,height,id);
  near(css.x,paint.left+width*.5+phaser.x,'same x '+id);
  near(css.y,paint.top+height*.5+phaser.y,'same y '+id);
  near(css.size,phaser.radius*2,'same size '+id);
  near(local.x,phaser.x,'local x');
  near(local.y,phaser.y,'local y');
  assert.equal(css.rotation,phaser.rotation);
 }
}
const fitted=lobbyMasteryPlacement({left:10,top:10,width:200,height:200},100,200,'helix_spark');
const actual=lobbyMasteryPlacement({left:60,top:10,width:100,height:200},100,200,'helix_spark');
near(fitted.x,actual.x,'object-fit width');
near(fitted.y,actual.y,'object-fit height');
near(fitted.size,actual.size,'object-fit size');
const out=mergeMasteryCalibration({cars:{helix_comet:legacy}},{
 helix_spark:{lobby:{x:.02,y:-.02,size:.01,rotation:90},race:{x:-.01,y:0,size:0,rotation:270}}
},['helix_comet','helix_spark','unknown']);
assert.equal(out.schema_version,2);
assert.equal(out.units,'car_short_axis_ratio');
assert.deepEqual(out.cars.helix_comet,canonicalMasteryCalibration(legacy),'Old per-view export still merges correctly');
assert.deepEqual(out.cars.helix_spark,{x:.02,y:-.02,size:.01,rotation:90});
assert.equal(out.cars.unknown,undefined);
const selectedExport=mergeMasteryCalibration(official,{},['helix_spark','helix_comet']).cars;
assert.deepEqual(Object.keys(selectedExport).sort(),['helix_comet','helix_spark']);
assert.deepEqual(selectedExport.helix_comet,official.cars.helix_comet);
assert.deepEqual(selectedExport.helix_spark,official.cars.helix_spark);
assert.deepEqual(mergeMasteryCalibration(official,{},allOfficialCarIds).cars,official.cars,'Full fleet export retains all published coordinates');
const editor=read('src/game/ui/AdminMasteryRoofCalibration.js');
for(const needle of [
 'data-rotate','data-nudge="up"','data-nudge="shrink"','data-reset-view',
 'data-car','initialCarId','badge.style.transform','saveDraft(draft)',
 'mergeMasteryCalibration','data-preview-visible','bindMasteryHoldRepeat(btn,',
 'hold.dispose()','touch-action:none!important','-webkit-touch-callout:none!important',
 'schema_version:2','canonicalMasteryCalibration','LOBBY + CARRERA'
])assert.ok(editor.includes(needle),'Missing unified editor behavior '+needle);
assert.ok(!editor.includes('data-view="race"'),'No separate race calibration');
assert.ok(!editor.includes('data-view="lobby"'),'No separate lobby calibration');
assert.ok(!editor.includes('current[view]'),'No independently saved view');
assert.ok(editor.includes("up:['y',-1],down:['y',1],left:['x',-1],right:['x',1]"));
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
assert.doesNotMatch(car,/carSpecs\.js\s*=|applyCarOverrides\(/);
console.log('Unified global mastery: same size, anchor, rotation and car-relative offsets in lobby/race, legacy drafts migrated, export v2 OK');
