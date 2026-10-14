import assetStatus from '../src/game/skins/cuperAssetsStatus.json' with {type:'json'};
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CAR_SPECS} from '../src/game/cars/carSpecs.js';
import {availableCarSkins,getEquippedCarSkin,equipCarSkin,selectedCarSkinFile,skinIsUnlocked,hasPublishedCarArt,CUPER_ASSETS_PUBLISHED} from '../src/game/skins/carSkins.js';
import {normalizeSkinGeometry,skinGeometryForSprite,mergeSkinGeometry} from '../src/game/skins/skinGeometry.js';
const read=p=>readFileSync(p,'utf8');
const car=CAR_SPECS.crown_cuper,axis=CAR_SPECS.crown_axis;
assert.equal(car.id,'crown_cuper');
assert.equal(CUPER_ASSETS_PUBLISHED,assetStatus.published===true,'Runtime flag tracks verified GitHub binaries');
assert.equal(hasPublishedCarArt('crown_cuper'),assetStatus.published===true,'Cuper only enters the garage with both valid sprites');
assert.equal(hasPublishedCarArt('helix_spark'),true);
assert.equal(car.collectionNo,18);
for(const k of ['maxFwd','maxRev','accel','brakeForce','engineBrake','linearDrag','turnRate','turnMin','gripCoast','gripDrive','gripBrake'])assert.equal(car[k],axis[k],'provisional physics: '+k);
assert.equal(availableCarSkins(car.id,car).length,2);
assert.equal(availableCarSkins('crown_axis',axis).length,1);
const data=new Map(),storage={getItem:key=>data.get(key)||null,setItem:(key,v)=>data.set(key,v)};
assert.equal(getEquippedCarSkin(car.id,{spec:car,storage,dev:true}).id,'original');
assert.equal(skinIsUnlocked(car.id,'gold',{dev:false}),false);
assert.deepEqual(equipCarSkin(car.id,'gold',{spec:car,storage,dev:false}),{ok:false,reason:'locked'});
assert.equal(equipCarSkin(car.id,'gold',{spec:car,storage,dev:true}).ok,true);
assert.equal(getEquippedCarSkin(car.id,{spec:car,storage,dev:true}).id,'gold');
assert.equal(getEquippedCarSkin(car.id,{spec:car,storage,dev:false}).id,'original');
assert.equal(selectedCarSkinFile(car.id,car,{storage,dev:true}),'skin_crown_cuper_gold.webp');
assert.equal(equipCarSkin(car.id,'original',{spec:car,storage,dev:true}).ok,true);
assert.equal(getEquippedCarSkin(car.id,{spec:car,storage,dev:true}).id,'original');
assert.equal(Object.keys(CAR_SPECS).filter(id=>!['stock','touring','power'].includes(id)).length,18);
assert.deepEqual(normalizeSkinGeometry({x:0,y:0,scale:0,rotation:0}),{x:0,y:0,scale:0,rotation:0});
assert.deepEqual(skinGeometryForSprite('crown_cuper','gold',50,100),{x:0,y:0,scale:1,rotation:0});
const merged=mergeSkinGeometry({cars:{}},{crown_cuper:{gold:{x:.02,y:-.03,scale:.01,rotation:90}}});
assert.equal(merged.cars.crown_cuper.gold.rotation,90);
for(const [path,marker] of [
 ['src/game/scenes/GarageLazyCardsScene.js','PERSONALIZAR · SKINS'],
 ['src/game/scenes/GarageLazyCardsScene.js','equipCarSkin(selected.id,button.dataset.skin'],
 ['src/game/ui/LobbyDomUi.js','selectedCarSkinFile(carId,spec'],
 ['src/game/scenes/RaceScene.js','selectedCarSkinFile(spec?.id,spec'],
 ['src/game/scenes/CarEditorScene.js','data-act="skin-geometry"'],
 ['src/game/ui/AdminSkinGeometryCalibration.js','bindMasteryHoldRepeat(button'],
 ['src/game/scenes/RaceScene.js','skinGeometryForSprite'],
 ['src/game/ui/LobbyDomUi.js','skinGeometry(carId,picked.id)']
])assert.ok(read(path).includes(marker),path+' missing '+marker);
assert.ok(!read('src/game/cars/carSpecs.js').includes('crown_cuper_gold:'),'One car ID for two skins');
console.log('Cuper: 18th car, 2 independent appearances, per-player selection, DEV preview, production premium gate, Admin calibration and renderer integration OK');
