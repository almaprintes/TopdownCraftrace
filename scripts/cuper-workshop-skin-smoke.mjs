import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {CAR_SPECS} from '../src/game/cars/carSpecs.js';
import {workshopCarArtworkCandidates,workshopCarPlacement,factorySkinGeometryId} from '../src/game/skins/workshopCarArt.js';
import {equipCarSkin} from '../src/game/skins/carSkins.js';

const storageData=new Map(),storage={
 getItem:key=>storageData.get(key)||null,
 setItem:(key,value)=>storageData.set(key,value)
};
const car=CAR_SPECS.crown_cuper;
const basic=['assets/cars/workshop/mini_cooper_black_white.webp','assets/skins/skin_crown_cuper_original.webp'];
const gold=['assets/cars/workshop/mini_cooper_black_gold.webp',...basic];
assert.deepEqual(workshopCarArtworkCandidates('crown_cuper',{spec:car,storage,dev:true}),basic);
assert.equal(equipCarSkin('crown_cuper','gold',{spec:car,storage,dev:true}).ok,true);
assert.deepEqual(workshopCarArtworkCandidates('crown_cuper',{spec:car,storage,dev:true}),gold);
assert.deepEqual(workshopCarArtworkCandidates('crown_cuper',{spec:car,storage,dev:false}),basic,
 'Production cannot display unowned premium factory variant');
assert.deepEqual(workshopCarArtworkCandidates('crown_axis',{spec:CAR_SPECS.crown_axis,storage,dev:true}),
 ['assets/cars/workshop/crown_axis.webp'],
 'Existing cars keep their original workshop art');
assert.equal(factorySkinGeometryId('gold'),'factory_gold');
assert.deepEqual(workshopCarPlacement('crown_cuper','gold',200,120),{x:0,y:0,scale:1,rotation:0});
assert.deepEqual(workshopCarPlacement('crown_cuper','gold',200,120,{crown_cuper:{factory_gold:{x:.1,y:-.2,scale:.05,rotation:90}}}),{x:12,y:-24,scale:1.05,rotation:90});
for(const filename of ['mini_cooper_black_white.webp','mini_cooper_black_gold.webp']){
 const path='public/assets/cars/workshop/'+filename;
 assert.ok(existsSync(path),'Factory render missing: '+path);
 const bytes=readFileSync(path);
 assert.equal(bytes.toString('ascii',0,4),'RIFF');
 assert.equal(bytes.toString('ascii',8,12),'WEBP');
 // Pillow lossless export uses VP8L, while extended WebP may use VP8X.
 const kind=bytes.toString('ascii',12,16);
 let width,height,hasAlpha;
 if(kind==='VP8L'){
  assert.equal(bytes[20],0x2f,'VP8L lossless bitstream signature');
  const header=bytes.readUInt32LE(21);
  width=(header&0x3fff)+1;
  height=((header>>>14)&0x3fff)+1;
  hasAlpha=!!((header>>>28)&1);
 }else if(kind==='VP8X'){
  width=1+bytes.readUIntLE(24,3);
  height=1+bytes.readUIntLE(27,3);
  hasAlpha=!!(bytes[20]&0x10);
 }else assert.fail('Unsupported factory WebP format: '+kind);
 assert.equal(width,1448,'Factory source width');
 assert.equal(height,1086,'Factory source height');
 assert.ok(hasAlpha,'Real transparent factory WebP required');
}
const reader=p=>readFileSync(p,'utf8');
const dom=reader('src/game/ui/WorkshopMobileDom.js');
const scene=reader('src/game/scenes/UpgradeWorkshopPremiumV3Scene.js');
const factory=reader('src/game/scenes/UpgradeWorkshopCarUnlockScene.js');
assert.match(dom,/workshopCarArtworkCandidates/);
assert.match(dom,/workshopCarPlacement/);
assert.match(dom,/__workshopSkinObserver\?\.disconnect/);
assert.match(dom,/ci\.onerror=\(\)=>\{index\+\+/);
assert.match(scene,/workshopCarArtworkCandidates\(this\.car/);
assert.match(scene,/workshopCarPlacement\(this\.car,skin\.id/);
assert.match(reader('src/game/ui/AdminSkinGeometryCalibration.js'),/FÁBRICA · 3\/4/);
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
