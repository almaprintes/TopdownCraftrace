import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {CAR_SPECS} from '../src/game/cars/carSpecs.js';
import {workshopCarArtworkCandidates} from '../src/game/skins/workshopCarArt.js';
import {equipCarSkin} from '../src/game/skins/carSkins.js';

const storageData=new Map(),storage={
 getItem:key=>storageData.get(key)||null,
 setItem:(key,value)=>storageData.set(key,value)
};
const car=CAR_SPECS.crown_cuper;
const basic=['assets/cars/workshop/crown_cuper.webp','assets/skins/skin_crown_cuper_original.webp'];
const gold=['assets/cars/workshop/crown_cuper_gold.webp',...basic];
assert.deepEqual(workshopCarArtworkCandidates('crown_cuper',{spec:car,storage,dev:true}),basic);
assert.equal(equipCarSkin('crown_cuper','gold',{spec:car,storage,dev:true}).ok,true);
assert.deepEqual(workshopCarArtworkCandidates('crown_cuper',{spec:car,storage,dev:true}),gold);
assert.deepEqual(workshopCarArtworkCandidates('crown_cuper',{spec:car,storage,dev:false}),basic,
 'Production cannot display unowned premium factory variant');
assert.deepEqual(workshopCarArtworkCandidates('crown_axis',{spec:CAR_SPECS.crown_axis,storage,dev:true}),
 ['assets/cars/workshop/crown_axis.webp'],
 'Existing cars keep their original workshop art');
const reader=p=>readFileSync(p,'utf8');
const dom=reader('src/game/ui/WorkshopMobileDom.js');
const scene=reader('src/game/scenes/UpgradeWorkshopPremiumV3Scene.js');
const factory=reader('src/game/scenes/UpgradeWorkshopCarUnlockScene.js');
assert.match(dom,/workshopCarArtworkCandidates/);
assert.match(dom,/ci\.onerror=\(\)=>\{index\+\+/);
assert.match(scene,/workshopCarArtworkCandidates\(this\.car/);
assert.match(scene,/workshop_render_v6_/);
assert.match(scene,/this\._workshopMissing\?\.add\(entry\.key\)/);
assert.match(factory,/hasPublishedCarArt\(id\)/);
for(const asset of ['original','gold']){
 const p=`public/assets/skins/skin_crown_cuper_${asset}.webp`;
 assert.ok(existsSync(p),'Top-down skin binary must be committed to GitHub: '+p);
 const bytes=readFileSync(p);
 assert.equal(bytes.toString('ascii',0,4),'RIFF');
 assert.equal(bytes.toString('ascii',8,12),'WEBP');
 assert.equal(bytes.toString('ascii',12,16),'VP8X');
 assert.equal(1+bytes.readUIntLE(24,3),512);
 assert.equal(1+bytes.readUIntLE(27,3),768);
 assert.ok(bytes[20]&0x10,'WebP must contain transparency');
}
console.log('CROWN Cuper factory: proper three-quarter art, selected skin and original fallback in DOM & Phaser; assets ready; old cars preserved OK');
